import { supabase } from "../lib/supabase";

export interface Genre {
  genre_id: string;
  genre_name: string;
  description: string | null;
}

export async function fetchGenres(): Promise<Genre[]> {
  const { data, error } = await supabase
    .schema("Mockingbird")
    .from("Genre")
    .select("*")
    .order("genre_name");

  if (error) throw error;
  return data ?? [];
}

export async function fetchUserGenres(userId: string): Promise<Genre[]> {
  const { data: prefs, error: prefsError } = await supabase
    .schema("Mockingbird")
    .from("user_prefs")
    .select("genre_id")
    .eq("user_id", userId);

  if (prefsError) throw prefsError;

  const genreIds = (prefs ?? []).map((p) => p.genre_id);
  if (genreIds.length === 0) return [];

  const { data, error } = await supabase
    .schema("Mockingbird")
    .from("Genre")
    .select("*")
    .in("genre_id", genreIds)
    .order("genre_name");

  if (error) throw error;
  return data ?? [];
}
