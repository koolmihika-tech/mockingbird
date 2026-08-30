import { supabase } from "../lib/supabase";

export interface Avatar {
  avatar_id: string;
  slug: string;
  title: string;
  image_url: string;
  sort_order: number;
}

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

/** Persist the user's chosen avatar. Stored on the auth user so it rides along
 *  with the session everywhere, mirroring how `display_name` is handled. */
export async function updateUserAvatar(imageUrl: string) {
  const { data, error } = await supabase.auth.updateUser({
    data: { avatar_url: imageUrl },
  });

  if (error) throw error;
  return data;
}
