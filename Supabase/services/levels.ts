import { supabase } from "../lib/supabase";

export interface Level {
  level_id: string;
  level_name: string;
  complexity: string | null;
}

export async function fetchAvailableLevels(): Promise<Level[]> {
  const { data, error } = await supabase
    .schema("Mockingbird")
    .from("levels")
    .select("*")
    .eq("level_name", "1");

  if (error) throw error;
  return data ?? [];
}

export async function saveUserLevel(userId: string, levelId: string): Promise<void> {
  const { error } = await supabase
    .schema("Mockingbird")
    .from("user_levels")
    .insert({ user_id: userId, level_id: levelId });

  if (error) throw error;
}
