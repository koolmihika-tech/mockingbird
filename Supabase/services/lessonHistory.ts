import { supabase } from "../lib/supabase";
import { getCurrentDbSessionId } from "./authenticate";

export interface LessonHistoryEntry {
  // null (not 0) means "no attempt in this category" — see logLessonHistory.
  grammarTimeSec?: number | null;
  vocabTimeSec: number;
  grammarAccuracy?: number | null; // 0-100
  vocabAccuracy: number; // 0-100
  totalAccuracy: number; // 0-100
}

// One row per lesson attempt: how long the learner spent on grammar- vs
// vocab-tagged questions (data/lessonQuestions.ts Question.category), and
// how accurately they answered each. lesson_id is levels.level_id — the same
// uuid already used to look up a topic's questions (getLessonQuestions) —
// or, for song practice, a song's data/songs.ts historyId. Grammar fields
// are omitted (inserted as null, not 0) for song sessions, which have no
// grammar/vocab split: a 0 would read as a real failed attempt to the ML
// feature pipeline (ml/fetch_lesson_history.py), fabricating grammar
// struggle that was never actually attempted.
export async function logLessonHistory(userId: string, lessonId: string, entry: LessonHistoryEntry) {
  const { error } = await supabase.from("lesson_history").insert({
    user_id: userId,
    session_id: getCurrentDbSessionId(),
    lesson_id: lessonId,
    grammar_time: entry.grammarTimeSec ?? null,
    vocab_time: entry.vocabTimeSec,
    grammar_accuracy: entry.grammarAccuracy ?? null,
    vocab_accuracy: entry.vocabAccuracy,
    total_accuracy: entry.totalAccuracy,
  });

  if (error) {
    console.error("Failed to log lesson history:", error.message);
  }
}

// Mirrors ml/priority_features.py's Attempt: one dated pass/fail observation
// for a (user, lesson_id/historyId, category) sequence, chronologically
// ordered, ready for Supabase/services/priorityScore.ts::scoreTopic.
export interface Attempt {
  day: number; // Unix days (seconds / 86400), matching the Python fetch script
  passed: boolean;
  timePerQSec: number;
}

const PASSING_SCORE = 70; // Supabase/services/activityHistory.ts PASSING_SCORE
const QUESTIONS_PER_CATEGORY = 4; // matches data/lessonQuestions.ts: 4 grammar + 4 vocab per topic

function toDayNumber(createdAt: string): number {
  return new Date(createdAt).getTime() / 1000 / 86400;
}

// Reshapes a user's lesson_history rows into per-(lesson_id, category)
// chronological attempt sequences — the exact transform
// ml/fetch_lesson_history.py::to_attempt_groups does for training, so the
// live TS score and the offline-fitted weights stay consistent. Rows with a
// null accuracy/time for a category (e.g. every song-practice row's grammar
// side) contribute no attempt for that category, same as the Python side.
export async function fetchAttemptsByLevel(userId: string): Promise<Map<string, { grammar: Attempt[]; vocab: Attempt[] }>> {
  const { data, error } = await supabase
    .from("lesson_history")
    .select("lesson_id, created_at, grammar_time, vocab_time, grammar_accuracy, vocab_accuracy")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch lesson history attempts:", error.message);
    return new Map();
  }

  const groups = new Map<string, { grammar: Attempt[]; vocab: Attempt[] }>();

  for (const row of data ?? []) {
    if (!row.lesson_id || !row.created_at) continue;
    const day = toDayNumber(row.created_at);
    const entry = groups.get(row.lesson_id) ?? { grammar: [], vocab: [] };
    groups.set(row.lesson_id, entry);

    if (row.grammar_time != null && row.grammar_accuracy != null) {
      entry.grammar.push({
        day,
        passed: row.grammar_accuracy >= PASSING_SCORE,
        timePerQSec: row.grammar_time / QUESTIONS_PER_CATEGORY,
      });
    }
    if (row.vocab_time != null && row.vocab_accuracy != null) {
      entry.vocab.push({
        day,
        passed: row.vocab_accuracy >= PASSING_SCORE,
        timePerQSec: row.vocab_time / QUESTIONS_PER_CATEGORY,
      });
    }
  }

  return groups;
}
