-- Selectable profile avatars.
--
-- Run this once in the Supabase SQL editor (or via `supabase db execute`).
-- Afterwards run `node scripts/seedAvatars.mjs` to upload assets/avatars/*.png
-- to the public "avatars" storage bucket and populate this table with the
-- resulting public URLs.

create table if not exists "Mockingbird"."avatars" (
  avatar_id  uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  title      text not null,
  image_url  text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Read-only catalogue: everyone may read, nobody may write through the API
-- (the seed script uses the service-role key, which bypasses RLS).
alter table "Mockingbird"."avatars" enable row level security;

drop policy if exists "Avatars are readable by everyone" on "Mockingbird"."avatars";
create policy "Avatars are readable by everyone"
  on "Mockingbird"."avatars"
  for select
  to anon, authenticated
  using (true);

-- The app builds public image URLs, so the bucket must be public. The bucket
-- itself was created in the dashboard; this just flips the public flag.
update storage.buckets set public = true where id = 'avatars';
