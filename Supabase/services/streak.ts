import { supabase } from "../lib/supabase";

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Counts consecutive calendar days (ending today, or yesterday if the user
// hasn't logged in yet today) on which user_sessions has at least one sign_in.
export async function getLoginStreak(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("user_sessions")
    .select("sign_in")
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to fetch login streak:", error.message);
    return 0;
  }

  const loginDays = new Set((data ?? []).map((row) => toDateKey(new Date(row.sign_in))));

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  let cursor: Date;
  if (loginDays.has(toDateKey(today))) {
    cursor = today;
  } else if (loginDays.has(toDateKey(yesterday))) {
    cursor = yesterday;
  } else {
    return 0;
  }

  let streak = 0;
  while (loginDays.has(toDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
