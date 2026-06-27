// lrclib.net — free, no API key required
// Provides plain lyrics and synced (timestamped) lyrics
const BASE_URL = "https://lrclib.net/api";

export interface LrclibTrack {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number; // seconds
  plainLyrics: string | null;   // plain text lyrics
  syncedLyrics: string | null;  // LRC format with timestamps e.g. [00:12.34] Line...
}

// Search for lyrics by track + artist name
export async function searchLyrics(
  trackName: string,
  artistName: string
): Promise<LrclibTrack[]> {
  const params = new URLSearchParams({ track_name: trackName, artist_name: artistName });
  const res = await fetch(`${BASE_URL}/search?${params}`);

  if (!res.ok) throw new Error(`lrclib error: ${res.status}`);

  const json = await res.json();
  return json as LrclibTrack[];
}

// Get lyrics for an exact match (best used after getting artist/track from Genius)
export async function getLyrics(
  trackName: string,
  artistName: string,
  albumName?: string,
  duration?: number
): Promise<LrclibTrack | null> {
  const params = new URLSearchParams({ track_name: trackName, artist_name: artistName });
  if (albumName) params.set("album_name", albumName);
  if (duration) params.set("duration", String(duration));

  const res = await fetch(`${BASE_URL}/get?${params}`);

  if (res.status === 404) return null; // no match found
  if (!res.ok) throw new Error(`lrclib error: ${res.status}`);

  return (await res.json()) as LrclibTrack;
}

// Parse synced lyrics string into an array of { time (seconds), text } objects
// Useful for highlighting the current line during playback
export function parseSyncedLyrics(lrc: string): { time: number; text: string }[] {
  return lrc
    .split("\n")
    .map((line) => {
      const match = line.match(/^\[(\d+):(\d+\.\d+)\](.*)/);
      if (!match) return null;
      const minutes = parseInt(match[1]);
      const seconds = parseFloat(match[2]);
      return { time: minutes * 60 + seconds, text: match[3].trim() };
    })
    .filter(Boolean) as { time: number; text: string }[];
}
