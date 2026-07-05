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
