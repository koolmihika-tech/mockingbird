/**
 * Uploads the 15 animal avatars in assets/avatars/ to the Supabase "avatars"
 * storage bucket and upserts a matching row (slug, title, image_url) into
 * Mockingbird.avatars.
 *
 * Prerequisites:
 *   1. Run Supabase/migrations/20260830_avatars.sql in the SQL editor.
 *   2. Generate the images: `python scripts/generate_avatar_emoji.py`
 *   3. Provide credentials, either exported or in a .env file at the repo root:
 *        EXPO_PUBLIC_SUPABASE_URL=...          (already in .env)
 *        SUPABASE_SERVICE_ROLE_KEY=...         (Dashboard -> Settings -> API)
 *
 * Run:  node scripts/seedAvatars.mjs
 *
 * Safe to re-run: uploads use upsert and rows are keyed on `slug`.
 */
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const AVATAR_DIR = join(ROOT, "assets", "avatars");
const BUCKET = "avatars";

// slug -> title. Order defines `sort_order`. Keep in sync with
// scripts/generate_avatar_emoji.py.
const AVATARS = [
  ["mockingbird", "Mockingbird"],
  ["fox", "Fox"],
  ["turtle", "Turtle"],
  ["owl", "Owl"],
  ["octopus", "Octopus"],
  ["lion", "Lion"],
  ["koala", "Koala"],
  ["penguin", "Penguin"],
  ["unicorn", "Unicorn"],
  ["dolphin", "Dolphin"],
  ["butterfly", "Butterfly"],
  ["cat", "Cat"],
  ["dog", "Dog"],
  ["panda", "Panda"],
  ["raccoon", "Raccoon"],
];

function loadEnv() {
  const env = { ...process.env };
  const file = join(ROOT, ".env");
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

const env = loadEnv();
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Add SUPABASE_SERVICE_ROLE_KEY to .env (Dashboard -> Settings -> API -> service_role)."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  db: { schema: "Mockingbird" },
  auth: { persistSession: false, autoRefreshToken: false },
});

let failed = false;

for (let i = 0; i < AVATARS.length; i++) {
  const [slug, title] = AVATARS[i];
  const objectPath = `${slug}.png`;
  try {
    const bytes = await readFile(join(AVATAR_DIR, objectPath));

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, bytes, { contentType: "image/png", upsert: true });
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);

    const { error: rowError } = await supabase
      .from("avatars")
      .upsert({ slug, title, image_url: publicUrl, sort_order: i }, { onConflict: "slug" });
    if (rowError) throw rowError;

    console.log(`  ✓ ${slug.padEnd(12)} ${publicUrl}`);
  } catch (err) {
    failed = true;
    console.error(`  ✗ ${slug.padEnd(12)} ${err.message ?? err}`);
  }
}

if (failed) {
  console.error("\nFinished with errors.");
  process.exit(1);
}
console.log(`\nDone - ${AVATARS.length} avatars uploaded and catalogued.`);
