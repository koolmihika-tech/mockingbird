import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import { getLyrics } from "../../api/lrclib";
import { SONGS } from "../../data/songs";
import vocab from "../../data/vocabulary.json";

// ─── YouTube player ──────────────────────────────────────────────────────────

interface VideoPlayerProps {
  videoIds: string[];
  songName: string;
}

function VideoPlayer({ videoIds, songName }: VideoPlayerProps) {
  const [idIndex, setIdIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  const currentId = videoIds[idIndex];
  const allFailed = idIndex >= videoIds.length;

  useEffect(() => {
    setIdIndex(0);
    setPlaying(true);
  }, [songName]);

  const tryNext = useCallback(() => {
    setIdIndex((i) => i + 1);
  }, []);

  const openOnYouTube = () => {
    const q = encodeURIComponent(`${songName} letra`);
    Linking.openURL(`https://www.youtube.com/results?search_query=${q}`);
  };

  if (allFailed) {
    return (
      <View style={styles.fallbackBox}>
        <Text style={styles.fallbackIcon}>▷</Text>
        <Text style={styles.fallbackTitle}>Video unavailable in app</Text>
        <Text style={styles.fallbackSub}>
          YouTube blocked embedding for all available versions of this song.
        </Text>
        <Pressable style={styles.youtubeBtn} onPress={openOnYouTube}>
          <Text style={styles.youtubeBtnText}>Open on YouTube ↗</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.videoContainer}>
      <YoutubePlayer
        key={`${songName}-${idIndex}`}
        height={210}
        videoId={currentId}
        play={playing}
        onChangeState={(state) => {
          if (state === "ended") setPlaying(false);
        }}
        onError={tryNext}
      />
    </View>
  );
}

// ─── Flashcard carousel ───────────────────────────────────────────────────────

function FlashCardCarousel({ entries, color }: { entries: [string, string][]; color: string }) {
  const [index, setIndex] = useState(0);
  const [word, definition] = entries[index];

  return (
    <View style={styles.flashcardsSection}>
      <Text style={styles.sectionHeader}>Vocabulary</Text>
      <Text style={styles.sectionSubheader}>Tap a card to flip • {index + 1} of {entries.length}</Text>
      <View style={styles.carouselRow}>
        <Pressable
          onPress={() => setIndex((i) => Math.max(0, i - 1))}
          style={[styles.arrowBtn, index === 0 && styles.arrowBtnDisabled]}
          disabled={index === 0}
        >
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <FlashCard key={word} word={word} definition={definition} color={color} />
        <Pressable
          onPress={() => setIndex((i) => Math.min(entries.length - 1, i + 1))}
          style={[styles.arrowBtn, index === entries.length - 1 && styles.arrowBtnDisabled]}
          disabled={index === entries.length - 1}
        >
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FlashCard({ word, definition, color }: { word: string; definition: string; color: string }) {
  const [flipped, setFlipped] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  function flip() {
    Animated.spring(anim, { toValue: flipped ? 0 : 1, friction: 8, useNativeDriver: true }).start();
    setFlipped(!flipped);
  }

  const frontRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const backRotate  = anim.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });

  return (
    <Pressable onPress={flip} style={styles.cardWrapper}>
      <Animated.View style={[styles.flashCard, { backgroundColor: color, transform: [{ rotateY: frontRotate }] }]}>
        <Text style={styles.flashCardWord}>{word}</Text>
        <Text style={styles.flashCardHint}>tap to reveal</Text>
      </Animated.View>
      <Animated.View style={[styles.flashCard, styles.flashCardBack, { backgroundColor: color, transform: [{ rotateY: backRotate }] }]}>
        <Text style={styles.flashCardDefinition}>{definition}</Text>
      </Animated.View>
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SongPlayerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const song = SONGS.find((s) => s.id === id);

  const [lyrics, setLyrics] = useState<string | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState(true);
  const [lyricsError, setLyricsError] = useState<string | null>(null);

  useEffect(() => {
    if (!song) return;
    setLoadingLyrics(true);
    setLyricsError(null);
    getLyrics(song.name, song.artist)
      .then((result) => setLyrics(result?.plainLyrics ?? "Lyrics not found for this track."))
      .catch(() => setLyricsError("Could not load lyrics."))
      .finally(() => setLoadingLyrics(false));
  }, [song?.id]);

  if (!song) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.notFound}>Song not found.</Text>
      </SafeAreaView>
    );
  }

  const songVocab = (vocab as Record<string, Record<string, string>>)[song.name] ?? {};
  const vocabEntries = Object.entries(songVocab);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Cover + title */}
        <View style={[styles.coverArt, { backgroundColor: song.coverColor }]}>
          <Text style={styles.coverNote}>♪</Text>
        </View>
        <Text style={styles.songName}>{song.name}</Text>
        <Text style={styles.songArtist}>{song.artist}</Text>

        {/* Video player with automatic fallback */}
        <VideoPlayer videoIds={song.videoIds} songName={song.name} />

        {/* Lyrics */}
        <View style={styles.lyricsSection}>
          <Text style={styles.sectionHeader}>Lyrics</Text>
          {loadingLyrics ? (
            <ActivityIndicator color="#5C3D2E" style={{ marginTop: 12 }} />
          ) : lyricsError ? (
            <Text style={styles.errorText}>{lyricsError}</Text>
          ) : (
            <Text style={styles.lyricsText}>{lyrics}</Text>
          )}
        </View>

        {/* Flashcards */}
        {vocabEntries.length > 0 && (
          <FlashCardCarousel entries={vocabEntries} color={song.coverColor} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: "#FDF6EC" },
  topBar:      { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  backBtn:     { alignSelf: "flex-start", backgroundColor: "#E8C5A0", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  backBtnText: { fontFamily: "Courier New", fontSize: 14, color: "#5C3D2E" },
  container:   { padding: 24, paddingBottom: 48, alignItems: "center" },
  coverArt: {
    width: 160, height: 160, borderRadius: 16,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  coverNote:   { fontSize: 60, color: "#5C3D2E" },
  songName:    { fontFamily: "Courier New", fontSize: 22, fontWeight: "bold", color: "#5C3D2E", textAlign: "center", marginBottom: 4 },
  songArtist:  { fontFamily: "Courier New", fontSize: 15, color: "#8B6347", textAlign: "center", marginBottom: 20 },

  // Video
  videoContainer: {
    width: "100%", aspectRatio: 16 / 9, borderRadius: 12,
    overflow: "hidden", backgroundColor: "#000", marginBottom: 28,
  },
  webview: { flex: 1 },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#111",
    alignItems: "center", justifyContent: "center",
    gap: 12, zIndex: 10,
  },
  videoOverlayText: { fontFamily: "Courier New", fontSize: 13, color: "#ccc", textAlign: "center", paddingHorizontal: 20 },

  // Fallback
  fallbackBox: {
    width: "100%", backgroundColor: "#FFF3E0", borderRadius: 12,
    padding: 24, alignItems: "center", marginBottom: 28, gap: 8,
  },
  fallbackIcon:  { fontSize: 36, color: "#8B6347" },
  fallbackTitle: { fontFamily: "Courier New", fontSize: 15, fontWeight: "bold", color: "#5C3D2E", textAlign: "center" },
  fallbackSub:   { fontFamily: "Courier New", fontSize: 12, color: "#8B6347", textAlign: "center", lineHeight: 18 },
  youtubeBtn: {
    marginTop: 8, backgroundColor: "#E8C5A0",
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
  },
  youtubeBtnText: { fontFamily: "Courier New", fontSize: 14, color: "#5C3D2E", fontWeight: "600" },

  // Lyrics
  lyricsSection: { width: "100%", marginBottom: 28 },
  sectionHeader: { fontFamily: "Courier New", fontSize: 16, fontWeight: "bold", color: "#5C3D2E", marginBottom: 4 },
  lyricsText:    { fontFamily: "Courier New", fontSize: 14, color: "#5C3D2E", lineHeight: 24 },
  errorText:     { fontFamily: "Courier New", fontSize: 14, color: "#B94A48" },

  // Flashcards
  flashcardsSection: { width: "100%", marginBottom: 28 },
  sectionSubheader:  { fontFamily: "Courier New", fontSize: 12, color: "#8B6347", marginBottom: 16 },
  carouselRow:       { flexDirection: "row", alignItems: "center", gap: 8 },
  arrowBtn:          { width: 36, height: 36, alignItems: "center", justifyContent: "center", backgroundColor: "#E8C5A0", borderRadius: 18 },
  arrowBtnDisabled:  { opacity: 0.3 },
  arrowText:         { fontSize: 24, color: "#5C3D2E", lineHeight: 28 },
  cardWrapper:       { flex: 1, height: 140 },
  flashCard: {
    position: "absolute", width: "100%", height: "100%", borderRadius: 12,
    alignItems: "center", justifyContent: "center", backfaceVisibility: "hidden",
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 2, padding: 12,
  },
  flashCardBack:       { position: "absolute" },
  flashCardWord:       { fontFamily: "Courier New", fontSize: 18, fontWeight: "bold", color: "#5C3D2E", textAlign: "center" },
  flashCardHint:       { fontFamily: "Courier New", fontSize: 10, color: "#8B6347", marginTop: 6 },
  flashCardDefinition: { fontFamily: "Courier New", fontSize: 15, color: "#5C3D2E", textAlign: "center", fontStyle: "italic" },

  notFound: { fontFamily: "Courier New", fontSize: 16, color: "#5C3D2E", padding: 24 },
});
