const ACCESS_TOKEN = process.env.EXPO_PUBLIC_GENIUS_ACCESS_TOKEN;
const BASE_URL = "https://api.genius.com";

export interface GeniusSong {
  id: number;
  title: string;
  artist: string;
  thumbnailUrl: string;
  url: string; // Genius page URL (not lyrics — Genius doesn't serve lyrics via API)
}

// Search for songs by query string
export async function searchSongs(query: string): Promise<GeniusSong[]> {
  const res = await fetch(
    `${BASE_URL}/search?q=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
    }
  );

  const json = await res.json();

  if (json.meta.status !== 200) {
    throw new Error(`Genius API error: ${json.meta.status}`);
  }

  // Each hit contains a "result" which is the song object
  return json.response.hits.map((hit: any) => ({
    id: hit.result.id,
    title: hit.result.title,
    artist: hit.result.primary_artist.name,
    thumbnailUrl: hit.result.song_art_image_thumbnail_url,
    url: hit.result.url,
  }));
}

// Get a single song's details by its Genius ID
export async function getSong(id: number): Promise<GeniusSong> {
  const res = await fetch(`${BASE_URL}/songs/${id}`, {
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
  });

  const json = await res.json();

  if (json.meta.status !== 200) {
    throw new Error(`Genius API error: ${json.meta.status}`);
  }

  const s = json.response.song;
  return {
    id: s.id,
    title: s.title,
    artist: s.primary_artist.name,
    thumbnailUrl: s.song_art_image_thumbnail_url,
    url: s.url,
  };
}
