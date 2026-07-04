import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export interface Question {
  prompt: string;
  targetWord: string;
  type: "multiple_choice" | "fill_blank" | "short_answer";
  options?: string[];
  answer: string;
}

// Calls the "generate-questions" Supabase Edge Function, which holds the
// Gemini API key server-side — the key never reaches the client.
export async function generateQuestions(
  songName: string,
  words: string[],
  mode: "reading" | "writing",
  count = 5
): Promise<Question[]> {
  // console.log("[questions] invoking generate-questions with:", { songName, words, mode, count });

  // const { data: sessionData } = await supabase.auth.getSession();
  // console.log("[questions] current session present:", !!sessionData?.session);

  const { data, error } = await supabase.functions.invoke("generate-questions", {
    body: { songName, words, mode, count },
  });

  // console.log("[questions] invoke returned, data:", data, "error:", error);

  if (error) {
    if (error instanceof FunctionsHttpError) {
      // console.log("[questions] FunctionsHttpError, status:", error.context?.status);
      const body = await error.context.json().catch((parseErr: any) => {
        // console.error("[questions] failed to parse error body as JSON:", parseErr);
        return null;
      });
      // console.log("[questions] parsed error body:", body);
      throw new Error(body?.error ?? error.message);
    }
    // console.error("[questions] non-HTTP error:", error);
    throw error;
  }
  // console.log("[questions] success, question count:", data?.questions?.length);
  return data.questions;
}
