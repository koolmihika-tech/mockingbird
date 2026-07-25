import { supabase } from "../lib/supabase";
import { getLoginStreak } from "./streak";

interface Badge {
  badge_id: string;
  name: string;
  type: string;
  quantity: number;
}

async function countActivity(userId: string, activityType: string): Promise<number> {
  const { count, error } = await supabase
    .from("user_activity_history")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("activity_type", activityType);

  if (error) {
    console.error("Failed to count activity for badges:", error.message);
    return 0;
  }
  return count ?? 0;
}

// Checks every badge the user hasn't already earned and awards any whose
// criteria are currently met. Meant to run once per sign-in.
export async function checkAndAwardBadges(userId: string) {
  const { data: badges, error: badgesError } = await supabase.from("badges").select("*");
  if (badgesError) {
    console.error("Failed to fetch badges:", badgesError.message);
    return;
  }
  if (!badges || badges.length === 0) return;

  const { data: earned, error: earnedError } = await supabase
    .from("user_badges")
    .select("badge_id")
    .eq("user_id", userId);

  if (earnedError) {
    console.error("Failed to fetch earned badges:", earnedError.message);
    return;
  }

  const earnedBadgeIds = new Set((earned ?? []).map((row) => row.badge_id));
  const unearned = (badges as Badge[]).filter((badge) => !earnedBadgeIds.has(badge.badge_id));
  if (unearned.length === 0) return;

  let songPlayedCount: number | null = null;
  let streak: number | null = null;

  for (const badge of unearned) {
    let earnedThisBadge = false;

    if (badge.type === "Songs") {
      if (songPlayedCount === null) {
        songPlayedCount = await countActivity(userId, "song played");
      }
      earnedThisBadge = songPlayedCount === badge.quantity;
    } else if (badge.type === "Days") {
      if (streak === null) {
        streak = await getLoginStreak(userId);
      }
      earnedThisBadge = streak === badge.quantity;
    }

    if (!earnedThisBadge) continue;

    const { error } = await supabase
      .from("user_badges")
      .upsert(
        { user_id: userId, badge_id: badge.badge_id },
        { onConflict: "user_id,badge_id", ignoreDuplicates: true }
      );

    if (error) {
      console.error(`Failed to award badge "${badge.name}":`, error.message);
    }
  }
}
