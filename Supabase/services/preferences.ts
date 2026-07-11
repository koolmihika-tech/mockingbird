import { supabase } from "../lib/supabase";

export async function hasUserPrefs(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .schema("Mockingbird")
    .from("user_prefs")
    .select("pref_id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function saveUserPrefs(userId: string, genreIds: string[]): Promise<void> {
  const { error: deleteError } = await supabase
    .schema("Mockingbird")
    .from("user_prefs")
    .delete()
    .eq("user_id", userId);

  if (deleteError) throw deleteError;

  const rows = genreIds.map((genre_id) => ({ user_id: userId, genre_id }));
  const { error } = await supabase
    .schema("Mockingbird")
    .from("user_prefs")
    .insert(rows);

  if (error) throw error;
}
