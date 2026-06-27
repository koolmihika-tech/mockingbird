// Spotify Web API helper — requires an access token from OAuth login
const BASE_URL = "https://api.spotify.com/v1";

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  durationMs: number;
  uri: string;
}

export interface NowPlaying {
  track: SpotifyTrack;
  isPlaying: boolean;
  progressMs: number;
}

function headers(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// Search for tracks
export async function searchTracks(
  token: string,
  query: string,
  limit = 10
): Promise<SpotifyTrack[]> {
  const params = new URLSearchParams({ q: query, type: "track", limit: String(limit) });
  const res = await fetch(`${BASE_URL}/search?${params}`, { headers: headers(token) });
  const json = await res.json();
  return json.tracks.items.map(parseTrack);
}

// Get currently playing track
export async function getNowPlaying(token: string): Promise<NowPlaying | null> {
  const res = await fetch(`${BASE_URL}/me/player/currently-playing`, {
    headers: headers(token),
  });
  if (res.status === 204 || res.status === 404) return null; // nothing playing
  const json = await res.json();
  if (!json.item) return null;
  return {
    track: parseTrack(json.item),
    isPlaying: json.is_playing,
    progressMs: json.progress_ms,
  };
}

// Play a track by URI (e.g. "spotify:track:xxxx")
export async function playTrack(token: string, uri: string): Promise<void> {
  await fetch(`${BASE_URL}/me/player/play`, {
    method: "PUT",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify({ uris: [uri] }),
  });
}

// Pause playback
export async function pause(token: string): Promise<void> {
  await fetch(`${BASE_URL}/me/player/pause`, {
    method: "PUT",
    headers: headers(token),
  });
}

// Resume playback
export async function play(token: string): Promise<void> {
  await fetch(`${BASE_URL}/me/player/play`, {
    method: "PUT",
    headers: headers(token),
  });
}

// Skip to next track
export async function skipNext(token: string): Promise<void> {
  await fetch(`${BASE_URL}/me/player/next`, {
    method: "POST",
    headers: headers(token),
  });
}

// Skip to previous track
export async function skipPrevious(token: string): Promise<void> {
  await fetch(`${BASE_URL}/me/player/previous`, {
    method: "POST",
    headers: headers(token),
  });
}

// Get user profile
export async function getProfile(token: string) {
  const res = await fetch(`${BASE_URL}/me`, { headers: headers(token) });
  return res.json();
}

// Internal helper to normalize Spotify track objects
function parseTrack(item: any): SpotifyTrack {
  return {
    id: item.id,
    name: item.name,
    artist: item.artists.map((a: any) => a.name).join(", "),
    album: item.album?.name ?? "",
    albumArt: item.album?.images?.[0]?.url ?? "",
    durationMs: item.duration_ms,
    uri: item.uri,
  };
}
