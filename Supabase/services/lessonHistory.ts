import { supabase } from "../lib/supabase";
import { getCurrentDbSessionId } from "./authenticate";

export interface LessonHistoryEntry {
  grammarTimeSec: number;
  vocabTimeSec: number;
  grammarAccuracy: number; // 0-100
  vocabAccuracy: number; // 0-100
  totalAccuracy: number; // 0-100
}

// One row per lesson attempt: how long the learner spent on grammar- vs
// vocab-tagged questions (data/lessonQuestions.ts Question.category), and
// how accurately they answered each. lesson_id is levels.level_id — the same
// uuid already used to look up a topic's questions (getLessonQuestions).
export async function logLessonHistory(userId: string, lessonId: string, entry: LessonHistoryEntry) {
  const { error } = await supabase.from("lesson_history").insert({
    user_id: userId,
    session_id: getCurrentDbSessionId(),
    lesson_id: lessonId,
    grammar_time: entry.grammarTimeSec,
    vocab_time: entry.vocabTimeSec,
    grammar_accuracy: entry.grammarAccuracy,
    vocab_accuracy: entry.vocabAccuracy,
    total_accuracy: entry.totalAccuracy,
  });

  if (error) {
    console.error("Failed to log lesson history:", error.message);
  }
}
