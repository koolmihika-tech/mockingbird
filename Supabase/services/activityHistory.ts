import { supabase } from "../lib/supabase";
import { getCurrentDbSessionId } from "./authenticate";

export type ActivityType = "song played" | "lesson";

export async function logActivity(
  userId: string,
  activityType: ActivityType,
  activityId: string,
  score?: number
) {
  const { error } = await supabase.from("user_activity_history").insert({
    user_id: userId,
    session_id: getCurrentDbSessionId(),
    activity_type: activityType,
    activity_id: activityId,
    ...(score !== undefined ? { score } : {}),
  });

  if (error) {
    console.error("Failed to log activity:", error.message);
  }
}

/** Minimum score (percent) an attempt must reach to count a lesson as passed. */
export const PASSING_SCORE = 70;

// Set of lesson ids (user_activity_history.activity_id for activity_type
// 'lesson') the user has *passed* — used to mark goal boxes as done in the
// reading/writing path. Every attempt is still logged; only attempts scoring at
// least PASSING_SCORE count as complete, and one passing attempt is enough.
export async function fetchCompletedLessonIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("user_activity_history")
    .select("activity_id")
    .eq("user_id", userId)
    .eq("activity_type", "lesson")
    .gte("score", PASSING_SCORE);

  if (error) {
    console.error("Failed to fetch completed lessons:", error.message);
    return new Set();
  }

  // Coerced to string so the lookup works whether activity_id comes back as
  // text or numeric.
  return new Set((data ?? []).map((row) => String(row.activity_id)));
}
