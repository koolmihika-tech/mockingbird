import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import { getLyrics } from "../api/lrclib";
import { useSupabaseAuth } from "../context/SupabaseAuth";
import { SONGS as PLACEHOLDER_SONGS, type Song } from "../data/songs";
import { fetchUserLevel, type Level } from "../Supabase/services/levels";


export default function SongsScreen() {
  const router = useRouter();
  const { user } = useSupabaseAuth();
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLevel, setUserLevel] = useState<Level | null>(null);
  const [loadingLevel, setLoadingLevel] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoadingLevel(false);
      return;
    }
    fetchUserLevel(user.id)
      .then(setUserLevel)
      .catch(() => setUserLevel(null))
      .finally(() => setLoadingLevel(false));
  }, [user]);

  const visibleSongs = useMemo(() => {
    if (!userLevel) return PLACEHOLDER_SONGS;
    return PLACEHOLDER_SONGS.filter((song) => song.level === userLevel.level_name);
  }, [userLevel]);

  async function handleSongPress(song: Song) {
    if (activeSong?.id === song.id) {
      setActiveSong(null);
      setLyrics(null);
      setError(null);
      return;
    }

    setActiveSong(song);
    setLyrics(null);
    setError(null);
    setLoadingLyrics(true);

    try {
      const result = await getLyrics(song.name, song.artist);
      setLyrics(result?.plainLyrics ?? "Lyrics not found for this track.");
    } catch {
      setError("Could not load lyrics.");
    } finally {
      setLoadingLyrics(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Songs</Text>
        <Pressable style={styles.homeBtn} onPress={() => router.push("/")}>
          <Text style={styles.homeBtnText}>home</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.container} nestedScrollEnabled>

        {loadingLevel ? (
          <ActivityIndicator color="#5C3D2E" style={{ marginTop: 20 }} />
        ) : visibleSongs.length === 0 ? (
          <Text style={styles.songArtist}>No songs available for your level yet.</Text>
        ) : (
        visibleSongs.map((song) => (
          <Pressable
            key={song.id}
            style={[
              styles.songRow,
              activeSong?.id === song.id && styles.songRowActive,
            ]}
            onPress={() => handleSongPress(song)}
          >
            <View style={styles.songInfo}>
              <Text style={styles.songName}>{song.name}</Text>
              <Text style={styles.songArtist}>{song.artist}</Text>
            </View>
            {activeSong?.id === song.id && (
              <Text style={styles.playingIndicator}>♪</Text>
            )}
          </Pressable>
        ))
        )}

        {activeSong && (
          <View style={styles.playerPanel}>
            <Text style={styles.playerTitle}>
              {activeSong.name} — {activeSong.artist}
            </Text>

            <View style={styles.videoContainer}>
              <YoutubePlayer
                height={210}
                videoId={activeSong.videoIds[0]}
                play
              />
            </View>

            <View style={styles.lyricsSection}>
              <Text style={styles.lyricsHeader}>Lyrics</Text>
              {loadingLyrics ? (
                <ActivityIndicator color="#5C3D2E" style={{ marginTop: 12 }} />
              ) : error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : (
                <Text style={styles.lyricsText}>{lyrics}</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FDF6EC",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  homeBtn: {
    backgroundColor: "#E8C5A0",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  homeBtnText: {
    fontFamily: "Courier New",
    fontSize: 14,
    color: "#5C3D2E",
  },
  heading: {
    fontSize: 26,
    fontFamily: "Courier New",
    color: "#5C3D2E",
    fontWeight: "bold",
  },
  songRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  songRowActive: {
    backgroundColor: "#E8C5A0",
  },
  songInfo: {
    flex: 1,
  },
  songName: {
    fontFamily: "Courier New",
    fontSize: 15,
    color: "#5C3D2E",
    fontWeight: "600",
  },
  songArtist: {
    fontFamily: "Courier New",
    fontSize: 13,
    color: "#8B6347",
    marginTop: 2,
  },
  playingIndicator: {
    fontSize: 20,
    color: "#5C3D2E",
  },
  playerPanel: {
    marginTop: 28,
    backgroundColor: "#FFF3E0",
    borderRadius: 16,
    padding: 20,
  },
  playerTitle: {
    fontFamily: "Courier New",
    fontSize: 15,
    fontWeight: "bold",
    color: "#5C3D2E",
    marginBottom: 14,
  },
  videoContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  lyricsSection: {
    marginTop: 20,
  },
  lyricsHeader: {
    fontFamily: "Courier New",
    fontSize: 14,
    fontWeight: "bold",
    color: "#5C3D2E",
    marginBottom: 10,
  },
  lyricsText: {
    fontFamily: "Courier New",
    fontSize: 14,
    color: "#5C3D2E",
    lineHeight: 24,
  },
  errorText: {
    fontFamily: "Courier New",
    fontSize: 14,
    color: "#B94A48",
  },
});
