-- Adds an "Irregulars" subtopic to each of levels 1–4.
--
-- Run this once in the Supabase SQL editor (or via `supabase db execute`).
-- The level_id values are fixed so they match data/lessonQuestions.ts
-- (lessonIds 17–20), which holds these topics' questions. complexity, genre
-- and suggested_song are copied from an existing row of the same level.

insert into "Mockingbird"."levels"
  (level_id, level_name, complexity, focus_area, topics, genre, suggested_song, goal)
select v.level_id::uuid, l.level_name, l.complexity, l.focus_area, v.topics, l.genre, l.suggested_song, 'Irregulars'
from (values
  ('8a97129b-72cf-4a8c-b34a-91900c21e6fc', '1', 'Irregular verbs: soy, voy, tengo, hago'),
  ('10bbf11d-e65f-43f3-a0b4-65a204f7953e', '2', 'Stem-changing verbs: quiero, puedo, duermo'),
  ('f8b8a408-be32-4b3c-820f-304d8a1840b0', '3', 'Irregular preterite: fui, tuve, hice'),
  ('dbd3e2b8-6830-4d63-b747-dada5aa68f39', '4', 'Irregular preterite: dije, traje, vine')
) as v(level_id, level_name, topics)
cross join lateral (
  select * from "Mockingbird"."levels" x
  where x.level_name = v.level_name
  limit 1
) l
on conflict (level_id) do nothing;
