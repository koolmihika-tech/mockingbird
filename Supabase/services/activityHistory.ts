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
