-- Populates Mockingbird.avatars after the 15 PNGs in assets/avatars/ have been
-- uploaded to the "avatars" storage bucket (e.g. by dragging them into the
-- Storage UI in the dashboard). Run this in the SQL editor.
--
-- URLs follow the public-object pattern:
--   <project-url>/storage/v1/object/public/avatars/<slug>.png
-- Requires the bucket to be public (the table migration flips that flag).
--
-- Safe to re-run: rows are keyed on `slug`.

insert into "Mockingbird"."avatars" (slug, title, image_url, sort_order) values
  ('mockingbird', 'Mockingbird', 'https://jblzvpijmfshunhehcac.supabase.co/storage/v1/object/public/avatars/mockingbird.png', 0),
  ('fox',         'Fox',         'https://jblzvpijmfshunhehcac.supabase.co/storage/v1/object/public/avatars/fox.png',         1),
  ('turtle',      'Turtle',      'https://jblzvpijmfshunhehcac.supabase.co/storage/v1/object/public/avatars/turtle.png',      2),
  ('owl',         'Owl',         'https://jblzvpijmfshunhehcac.supabase.co/storage/v1/object/public/avatars/owl.png',         3),
  ('octopus',     'Octopus',     'https://jblzvpijmfshunhehcac.supabase.co/storage/v1/object/public/avatars/octopus.png',     4),
  ('lion',        'Lion',        'https://jblzvpijmfshunhehcac.supabase.co/storage/v1/object/public/avatars/lion.png',        5),
  ('koala',       'Koala',       'https://jblzvpijmfshunhehcac.supabase.co/storage/v1/object/public/avatars/koala.png',       6),
  ('penguin',     'Penguin',     'https://jblzvpijmfshunhehcac.supabase.co/storage/v1/object/public/avatars/penguin.png',     7),
  ('unicorn',     'Unicorn',     'https://jblzvpijmfshunhehcac.supabase.co/storage/v1/object/public/avatars/unicorn.png',     8),
  ('dolphin',     'Dolphin',     'https://jblzvpijmfshunhehcac.supabase.co/storage/v1/object/public/avatars/dolphin.png',     9),
  ('butterfly',   'Butterfly',   'https://jblzvpijmfshunhehcac.supabase.co/storage/v1/object/public/avatars/butterfly.png',   10),
  ('cat',         'Cat',         'https://jblzvpijmfshunhehcac.supabase.co/storage/v1/object/public/avatars/cat.png',         11),
  ('dog',         'Dog',         'https://jblzvpijmfshunhehcac.supabase.co/storage/v1/object/public/avatars/dog.png',         12),
  ('panda',       'Panda',       'https://jblzvpijmfshunhehcac.supabase.co/storage/v1/object/public/avatars/panda.png',       13),
  ('raccoon',     'Raccoon',     'https://jblzvpijmfshunhehcac.supabase.co/storage/v1/object/public/avatars/raccoon.png',     14)
on conflict (slug) do update set
  title = excluded.title,
  image_url = excluded.image_url,
  sort_order = excluded.sort_order;
