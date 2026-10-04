import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Question } from "./questions";

export type WritingLevel = "correct" | "minor" | "incorrect";

export interface WritingError {
  /** The learner's words that are wrong. */
  text: string;
  /** The corrected Spanish. */
  fix: string;
  /** Short explanation in English. */
  why: string;
}

export interface WritingGrade {
  level: WritingLevel;
  usesTargetWord: boolean;
  /** 1–2 sentence verdict in English. */
  explanation: string;
  errors: WritingError[];
  /** The learner's sentence with mistakes fixed (and accents added). */
  correctedSentence: string;
}

// ─── Rule checks (instant, no network) ───────────────────────────────────────

// Lowercase and strip accent marks (keeping ñ).
function stripMarks(s: string): string {
  return s
    .normalize("NFD")
    .replace(/ñ/g, "ñ")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// stripMarks, then drop punctuation and collapse whitespace.
function normalize(s: string): string {
  return stripMarks(s)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ARTICLES = new Set(["el", "la", "los", "las", "un", "una", "unos", "unas"]);

// "amigo" -> "amig" so amiga / amigos / amigas also match.
function stem(word: string): string {
  const s = word.replace(/(es|s)$/, "").replace(/[aeo]$/, "");
  return s.length >= 3 ? s : word;
}

/** Words the target asks for, or null when the target can't be checked by
 *  simple word matching — left to the model instead:
 *  - grammar patterns / labels ("ser + profession", "día (lowercase)")
 *  - topic labels the prompt doesn't actually require ("nacionalidad / país"
 *    for "write your nationality") — only enforced when the prompt names it
 *  - verbs, which change form when conjugated (tener -> tengo) */
function targetAlternatives(targetWord: string, prompt: string): string[][] | null {
  if (!targetWord || /[+()…]|\.\.\./.test(targetWord)) return null;
  // Required only when the prompt quotes it ("using 'gracias'") — a bare
  // mention can just be English ("describe the color of...").
  const promptText = stripMarks(prompt);
  const named = targetWord.split("/").some((alt) => {
    const t = stripMarks(alt).trim();
    return ["'", '"', "‘", "“", "«"].some((q) => promptText.includes(q + t));
  });
  if (!named) return null;
  const alternatives = targetWord
    .split("/")
    .map((alt) => {
      const words = normalize(alt).split(" ").filter(Boolean);
      // Drop articles from phrases ("la maestra" -> "maestra"), but never a
      // whole one-word target ("él" normalizes to "el").
      return words.length > 1 ? words.filter((w) => !ARTICLES.has(w)) : words;
    })
    .filter((words) => words.length > 0);
  if (alternatives.length === 0) return null;
  // Infinitives (tener, llamarse...) get conjugated, so word matching would
  // reject correct sentences.
  const isVerb = (w: string) => /(ar|er|ir|arse|erse|irse)$/.test(w) && w.length > 3;
  if (alternatives.some((words) => words.some(isVerb))) return null;
  return alternatives;
}

function usesTarget(sentence: string, alternatives: string[][]): boolean {
  const words = normalize(sentence).split(" ");
  const stems = new Set(words.map(stem));
  return alternatives.some((alt) => alt.every((w) => words.includes(w) || stems.has(stem(w))));
}

/** Returns a grade when the sentence clearly fails a simple rule, otherwise
 *  null (meaning: send it to the model). */
export function ruleCheck(question: Question, sentence: string): WritingGrade | null {
  const words = normalize(sentence).split(" ").filter(Boolean);
  if (words.length < 2) {
    return {
      level: "incorrect",
      usesTargetWord: false,
      explanation: "Write a full sentence — at least a few words — to answer the prompt.",
      errors: [],
      correctedSentence: "",
    };
  }
  const alternatives = targetAlternatives(question.targetWord, question.prompt);
  if (alternatives && !usesTarget(sentence, alternatives)) {
    return {
      level: "incorrect",
      usesTargetWord: false,
      explanation: `Your sentence needs to use "${question.targetWord}".`,
      errors: [],
      correctedSentence: "",
    };
  }
  return null;
}

// ─── Model grading ───────────────────────────────────────────────────────────

// Rule checks first; anything that passes goes to the "grade-writing"
// Supabase Edge Function, which holds the Gemini API key server-side.
export async function gradeWriting(question: Question, sentence: string): Promise<WritingGrade> {
  const ruled = ruleCheck(question, sentence);
  if (ruled) return ruled;

  const { data, error } = await supabase.functions.invoke("grade-writing", {
    body: {
      prompt: question.prompt,
      targetWord: question.targetWord,
      sampleAnswer: question.answer,
      sentence,
    },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      throw new Error(body?.error ?? error.message);
    }
    throw error;
  }

  return {
    level: data?.level === "correct" || data?.level === "minor" ? data.level : "incorrect",
    usesTargetWord: !!data?.usesTargetWord,
    explanation: data?.explanation ?? "",
    errors: Array.isArray(data?.errors) ? data.errors : [],
    correctedSentence: data?.correctedSentence ?? "",
  };
}
