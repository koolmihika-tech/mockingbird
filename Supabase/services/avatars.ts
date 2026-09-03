import { supabase } from "../lib/supabase";

export interface Avatar {
  avatar_id: string;
  slug: string;
  title: string;
  image_url: string;
  sort_order: number;
}

/** Catalogue title assigned to every user until they pick their own. */
export const DEFAULT_AVATAR = "Mockingbird";

/** The selectable profile-picture catalogue, seeded by scripts/seedAvatars.mjs. */
export async function fetchAvatars(): Promise<Avatar[]> {
  const { data, error } = await supabase
    .schema("Mockingbird")
    .from("avatars")
    .select("*")
    .order("sort_order");

  if (error) throw error;
  return data ?? [];
}

/** Persist the user's chosen avatar in Mockingbird.user_avatar, one row per user
 *  keyed by user_id. The stored `avatar` value is the catalogue title (FK to
 *  avatars.title), not a URL — resolve it back with fetchAvatars() when rendering.
 *  Delete-then-insert so the choice can be changed later. */
export async function updateUserAvatar(userId: string, avatar: string) {
  const { error: deleteError } = await supabase
    .schema("Mockingbird")
    .from("user_avatar")
    .delete()
    .eq("user_id", userId);

  if (deleteError) throw deleteError;

  const { error } = await supabase
    .schema("Mockingbird")
    .from("user_avatar")
    .insert({ user_id: userId, avatar });

  if (error) throw error;
}

/** The catalogue title of the user's chosen avatar, falling back to DEFAULT_AVATAR
 *  for users who haven't picked one. Never throws — a missing row or an unreadable
 *  user_avatar table just yields the default, so callers can load it alongside
 *  other data without a failure taking down the whole screen. */
export async function fetchUserAvatar(userId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .schema("Mockingbird")
      .from("user_avatar")
      .select("avatar")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data?.avatar ?? DEFAULT_AVATAR;
  } catch (e) {
    console.error("Failed to load user avatar:", e);
    return DEFAULT_AVATAR;
  }
}
