import { supabase } from "../lib/supabase";

export interface Level {
  level_id: string;
  level_name: string;
  complexity: string | null;
}

export interface LevelTopic extends Level {
  topics: string;
  focus_area: string | null;
  goal: string | null;
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

export async function fetchAllLevelTopics(): Promise<LevelTopic[]> {
  const { data, error } = await supabase
    .schema("Mockingbird")
    .from("levels")
    .select("*");

  if (error) throw error;
  return data ?? [];
}

export async function saveUserLevel(userId: string, levelId: string): Promise<void> {
  const { error } = await supabase
    .schema("Mockingbird")
    .from("user_levels")
    .upsert({ user_id: userId, level_id: levelId }, { onConflict: "user_id" });

  if (error) throw error;
}

export async function fetchUserLevel(userId: string): Promise<Level | null> {
  const { data, error } = await supabase
    .schema("Mockingbird")
    .from("user_levels")
    .select("level_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { data: level, error: levelError } = await supabase
    .schema("Mockingbird")
    .from("levels")
    .select("*")
    .eq("level_id", data.level_id)
    .maybeSingle();

  if (levelError) throw levelError;
  return level ?? null;
}
