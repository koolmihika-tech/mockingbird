import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import YoutubePlayer, { YoutubeIframeRef } from "react-native-youtube-iframe";
import { getLyrics, parseSyncedLyrics } from "../../api/lrclib";
import { useSupabaseAuth } from "../../context/SupabaseAuth";
import { SONGS } from "../../data/songs";
import vocab from "../../data/vocabulary.json";
import { logActivity } from "../../Supabase/services/activityHistory";

const SCREEN_WIDTH = Dimensions.get("window").width;

// ─── Tappable vocabulary words within lyrics ─────────────────────────────────

// Splits a block of text into tokens, tagging any token whose word matches a
// vocabulary.json key so it can be rendered as an underlined, tappable word.
function tokenizeVocabText(text: string, vocabMap: Record<string, string>) {
  const parts = text.split(/(\s+)/);
  const tokens: { key: string; content: string; definition?: string }[] = [];
  parts.forEach((part, i) => {
    if (part === "") return;
    if (/^\s+$/.test(part)) {
      tokens.push({ key: `ws${i}`, content: part });
      return;
    }
    const match = part.match(/^([^\p{L}]*)([\p{L}][\p{L}'-]*)([^\p{L}]*)$/u);
    if (!match) {
      tokens.push({ key: `p${i}`, content: part });
      return;
    }
    const [, prefix, word, suffix] = match;
    if (prefix) tokens.push({ key: `p${i}a`, content: prefix });
    tokens.push({ key: `w${i}`, content: word, definition: vocabMap[word.toLowerCase()] });
    if (suffix) tokens.push({ key: `p${i}b`, content: suffix });
  });
  return tokens;
}

function renderVocabText(
  text: string,
  vocabMap: Record<string, string>,
  onWordPress: (word: string, definition: string, x: number, y: number) => void
) {
  return tokenizeVocabText(text, vocabMap).map((t) =>
    t.definition ? (
      <Text
        key={t.key}
        style={styles.vocabWord}
        onPress={(e) => onWordPress(t.content, t.definition!, e.nativeEvent.pageX, e.nativeEvent.pageY)}
      >
        {t.content}
      </Text>
    ) : (
      t.content
    )
  );
}

// ─── YouTube player ──────────────────────────────────────────────────────────

interface VideoPlayerProps {
  videoIds: string[];
  songName: string;
  playerRef: React.RefObject<YoutubeIframeRef>;
  playing: boolean;
  onPlayingChange: (p: boolean) => void;
}

function VideoPlayer({ videoIds, songName, playerRef, playing, onPlayingChange }: VideoPlayerProps) {
  const [idIndex, setIdIndex] = useState(0);

  const currentId = videoIds[idIndex];
  const allFailed = idIndex >= videoIds.length;

  useEffect(() => {
    setIdIndex(0);
    onPlayingChange(true);
  }, [songName]);

  const tryNext = useCallback(() => setIdIndex((i) => i + 1), []);

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
        ref={playerRef}
        key={`${songName}-${idIndex}`}
        height={210}
        videoId={currentId}
        play={playing}
        onChangeState={(state) => {
          if (state === "playing") onPlayingChange(true);
          if (state === "paused" || state === "ended") onPlayingChange(false);
        }}
        onError={tryNext}
      />
    </View>
  );
}

// ─── Synced lyrics ────────────────────────────────────────────────────────────

interface SyncedLyricsProps {
  lines: { time: number; text: string }[];
  activeLine: number;
  onLinePress: (time: number) => void;
  vocab: Record<string, string>;
  onWordPress: (word: string, definition: string, x: number, y: number) => void;
}

function SyncedLyricsView({ lines, activeLine, onLinePress, vocab, onWordPress }: SyncedLyricsProps) {
  const scrollRef = useRef<ScrollView>(null);
  const lineOffsetsRef = useRef<number[]>([]);

  useEffect(() => {
    const y = lineOffsetsRef.current[activeLine];
    if (y != null) {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 120), animated: true });
    }
  }, [activeLine]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.syncedScroll}
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
    >
      {lines.map((line, i) => (
        <Pressable
          key={i}
          onLayout={(e) => { lineOffsetsRef.current[i] = e.nativeEvent.layout.y; }}
          onPress={() => onLinePress(line.time)}
          style={styles.lyricLineWrapper}
        >
          <Text style={[styles.lyricLine, i === activeLine && styles.lyricLineActive]}>
            {line.text ? renderVocabText(line.text, vocab, onWordPress) : " "}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
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
  const { user } = useSupabaseAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const song = SONGS.find((s) => s.id === id);

  const playerRef = useRef<YoutubeIframeRef>(null);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!song || !user) return;
    logActivity(user.id, "song played", song.id);
  }, [song?.id, user?.id]);

  const [syncedLines, setSyncedLines] = useState<{ time: number; text: string }[] | null>(null);
  const [plainLyrics, setPlainLyrics] = useState<string | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState(true);
  const [lyricsError, setLyricsError] = useState<string | null>(null);
  const [activeLine, setActiveLine] = useState(0);
  const [activeDefinition, setActiveDefinition] = useState<
    { word: string; definition: string; x: number; y: number } | null
  >(null);

  useEffect(() => {
    if (!song) return;
    setLoadingLyrics(true);
    setLyricsError(null);
    setSyncedLines(null);
    setPlainLyrics(null);
    setActiveLine(0);
    getLyrics(song.name, song.artist)
      .then((result) => {
        if (result?.syncedLyrics) {
          setSyncedLines(parseSyncedLyrics(result.syncedLyrics));
        } else {
          setPlainLyrics(result?.plainLyrics ?? "Lyrics not found for this track.");
        }
      })
      .catch(() => setLyricsError("Could not load lyrics."))
      .finally(() => setLoadingLyrics(false));
  }, [song?.id]);

  // Poll playback position every 500ms to drive lyric highlighting
  useEffect(() => {
    if (!syncedLines || syncedLines.length === 0) return;
    const interval = setInterval(async () => {
      if (Platform.OS === "web") return;
      const time = await playerRef.current?.getCurrentTime();
      if (time == null) return;
      let idx = 0;
      for (let i = 0; i < syncedLines.length; i++) {
        if (syncedLines[i].time <= time) idx = i;
        else break;
      }
      setActiveLine(idx);
    }, 500);
    return () => clearInterval(interval);
  }, [syncedLines]);

  const handleLyricPress = useCallback((time: number) => {
    playerRef.current?.seekTo(time, true);
    setPlaying(true);
  }, []);

  const handleWordPress = useCallback((word: string, definition: string, x: number, y: number) => {
    setActiveDefinition({ word, definition, x, y });
  }, []);

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
        <View style={[styles.coverArt, { backgroundColor: song.coverColor }]}>
          <Text style={styles.coverNote}>♪</Text>
        </View>
        <Text style={styles.songName}>{song.name}</Text>
        <Text style={styles.songArtist}>{song.artist}</Text>

        <VideoPlayer
          videoIds={song.videoIds}
          songName={song.name}
          playerRef={playerRef}
          playing={playing}
          onPlayingChange={setPlaying}
        />

        <View style={styles.lyricsSection}>
          <Text style={styles.sectionHeader}>Lyrics</Text>
          {loadingLyrics ? (
            <ActivityIndicator color="#5C3D2E" style={{ marginTop: 12 }} />
          ) : lyricsError ? (
            <Text style={styles.errorText}>{lyricsError}</Text>
          ) : syncedLines ? (
            <SyncedLyricsView
              lines={syncedLines}
              activeLine={activeLine}
              onLinePress={handleLyricPress}
              vocab={songVocab}
              onWordPress={handleWordPress}
            />
          ) : (
            <Text style={styles.lyricsText}>
              {plainLyrics ? renderVocabText(plainLyrics, songVocab, handleWordPress) : null}
            </Text>
          )}
        </View>

        {vocabEntries.length > 0 && (
          <FlashCardCarousel entries={vocabEntries} color={song.coverColor} />
        )}
      </ScrollView>

      {activeDefinition && (
        <>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setActiveDefinition(null)} />
          <View
            pointerEvents="none"
            style={[
              styles.definitionBubble,
              {
                left: Math.min(Math.max(activeDefinition.x - 80, 12), SCREEN_WIDTH - 172),
                top: Math.max(activeDefinition.y - 74, 40),
              },
            ]}
          >
            <Text style={styles.definitionWord}>{activeDefinition.word}</Text>
            <Text style={styles.definitionText}>{activeDefinition.definition}</Text>
          </View>
        </>
      )}
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
  lyricsSection:   { width: "100%", marginBottom: 28 },
  sectionHeader:   { fontFamily: "Courier New", fontSize: 16, fontWeight: "bold", color: "#5C3D2E", marginBottom: 8 },
  lyricsText:      { fontFamily: "Courier New", fontSize: 14, color: "#5C3D2E", lineHeight: 24 },
  errorText:       { fontFamily: "Courier New", fontSize: 14, color: "#B94A48" },

  // Synced lyrics
  syncedScroll:      { height: 320 },
  lyricLineWrapper:  { paddingVertical: 6, paddingHorizontal: 4 },
  lyricLine:         { fontFamily: "Courier New", fontSize: 15, color: "#C4A882", lineHeight: 22 },
  lyricLineActive:   { color: "#5C3D2E", fontSize: 17, fontWeight: "bold" },

  // Tappable vocabulary words
  vocabWord: { textDecorationLine: "underline" },
  definitionBubble: {
    position: "absolute", maxWidth: 160,
    backgroundColor: "#FFF3E0", borderRadius: 10, borderWidth: 1, borderColor: "#E8D5C0",
    paddingHorizontal: 12, paddingVertical: 8,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  definitionWord: { fontFamily: "Courier New", fontSize: 12, fontWeight: "700", color: "#5C3D2E", marginBottom: 2 },
  definitionText: { fontFamily: "Courier New", fontSize: 12, color: "#5C3D2E" },

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
