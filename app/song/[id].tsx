import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Linking,
  Platform,
  Pressable,
  Text as RNText,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { ActivityIndicator, Surface, Text } from "react-native-paper";
import YoutubePlayer, { YoutubeIframeRef } from "react-native-youtube-iframe";
import { getLyrics, parseSyncedLyrics } from "../../api/lrclib";
import { AppScaffold } from "../../components/AppScaffold";
import { FlashCardCarousel } from "../../components/FlashCards";
import { useAppTheme, type AppTheme } from "../../constants/theme";
import { useSupabaseAuth } from "../../context/SupabaseAuth";
import { SONGS } from "../../data/songs";
import vocab from "../../data/vocabulary.json";
import { logActivity } from "../../Supabase/services/activityHistory";

const SCREEN_WIDTH = Dimensions.get("window").width;

type Styles = ReturnType<typeof makeStyles>;

// ─── Tappable vocabulary words within lyrics ─────────────────────────────────

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
  onWordPress: (word: string, definition: string, x: number, y: number) => void,
  styles: Styles
) {
  return tokenizeVocabText(text, vocabMap).map((t) =>
    t.definition ? (
      <RNText
        key={t.key}
        style={styles.vocabWord}
        onPress={(e) => onWordPress(t.content, t.definition!, e.nativeEvent.pageX, e.nativeEvent.pageY)}
      >
        {t.content}
      </RNText>
    ) : (
      t.content
    )
  );
}

// ─── YouTube player ──────────────────────────────────────────────────────────

interface VideoPlayerProps {
  videoIds: string[];
  songName: string;
  playerRef: React.RefObject<YoutubeIframeRef | null>;
  playing: boolean;
  onPlayingChange: (p: boolean) => void;
  styles: Styles;
}

function VideoPlayer({ videoIds, songName, playerRef, playing, onPlayingChange, styles }: VideoPlayerProps) {
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
        <MaterialCommunityIcons name="play-circle-outline" size={40} style={styles.fallbackIcon} />
        <Text variant="titleSmall" style={styles.fallbackTitle}>
          Video unavailable in app
        </Text>
        <Text variant="bodySmall" style={styles.fallbackSub}>
          YouTube blocked embedding for all available versions of this song.
        </Text>
        <Pressable style={styles.youtubeBtn} onPress={openOnYouTube}>
          <Text variant="labelLarge" style={styles.youtubeBtnText}>
            Open on YouTube ↗
          </Text>
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
        onChangeState={(state: string) => {
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
  styles: Styles;
}

function SyncedLyricsView({ lines, activeLine, onLinePress, vocab, onWordPress, styles }: SyncedLyricsProps) {
  const scrollRef = useRef<ScrollView>(null);
  const lineOffsetsRef = useRef<number[]>([]);

  useEffect(() => {
    const y = lineOffsetsRef.current[activeLine];
    if (y != null) {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 120), animated: true });
    }
  }, [activeLine]);

  return (
    <ScrollView ref={scrollRef} style={styles.syncedScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
      {lines.map((line, i) => (
        <Pressable
          key={i}
          onLayout={(e) => {
            lineOffsetsRef.current[i] = e.nativeEvent.layout.y;
          }}
          onPress={() => onLinePress(line.time)}
          style={styles.lyricLineWrapper}
        >
          <RNText style={[styles.lyricLine, i === activeLine && styles.lyricLineActive]}>
            {line.text ? renderVocabText(line.text, vocab, onWordPress, styles) : " "}
          </RNText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SongPlayerScreen() {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
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
      <AppScaffold title="Song" back>
        <Text variant="titleMedium" style={styles.notFound}>
          Song not found.
        </Text>
      </AppScaffold>
    );
  }

  const songVocab = (vocab as Record<string, Record<string, string>>)[song.name] ?? {};
  const vocabEntries = Object.entries(songVocab);

  return (
    <AppScaffold title={song.name} back>
      <ScrollView contentContainerStyle={styles.container}>
        <Surface style={[styles.coverArt, { backgroundColor: song.coverColor }]} elevation={2}>
          <MaterialCommunityIcons name="music" size={60} color="#3B2A1F" />
        </Surface>
        <Text variant="headlineSmall" style={styles.songName}>
          {song.name}
        </Text>
        <Text variant="bodyMedium" style={styles.songArtist}>
          {song.artist}
        </Text>

        <VideoPlayer
          videoIds={song.videoIds}
          songName={song.name}
          playerRef={playerRef}
          playing={playing}
          onPlayingChange={setPlaying}
          styles={styles}
        />

        <View style={styles.lyricsSection}>
          <Text variant="titleMedium" style={styles.sectionHeader}>
            Lyrics
          </Text>
          {loadingLyrics ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 12 }} />
          ) : lyricsError ? (
            <Text variant="bodyMedium" style={styles.errorText}>
              {lyricsError}
            </Text>
          ) : syncedLines ? (
            <SyncedLyricsView
              lines={syncedLines}
              activeLine={activeLine}
              onLinePress={handleLyricPress}
              vocab={songVocab}
              onWordPress={handleWordPress}
              styles={styles}
            />
          ) : (
            <RNText style={styles.lyricsText}>
              {plainLyrics ? renderVocabText(plainLyrics, songVocab, handleWordPress, styles) : null}
            </RNText>
          )}
        </View>

        {vocabEntries.length > 0 && (
          <View style={styles.flashcardsSection}>
            <Text variant="titleMedium" style={styles.sectionHeader}>
              Vocabulary
            </Text>
            <FlashCardCarousel entries={vocabEntries} color={song.coverColor} />
          </View>
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
            <RNText style={styles.definitionWord}>{activeDefinition.word}</RNText>
            <RNText style={styles.definitionText}>{activeDefinition.definition}</RNText>
          </View>
        </>
      )}
    </AppScaffold>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.background },
    container: { padding: 24, paddingBottom: 48, alignItems: "center" },
    coverArt: {
      width: 160,
      height: 160,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    songName: { color: theme.colors.onBackground, fontWeight: "800", textAlign: "center", marginBottom: 4 },
    songArtist: { color: theme.colors.onSurfaceVariant, textAlign: "center", marginBottom: 20 },

    videoContainer: { width: "100%", aspectRatio: 16 / 9, borderRadius: 16, overflow: "hidden", backgroundColor: "#000", marginBottom: 28 },

    fallbackBox: { width: "100%", backgroundColor: theme.colors.surfaceVariant, borderRadius: 16, padding: 24, alignItems: "center", marginBottom: 28, gap: 8 },
    fallbackIcon: { color: theme.colors.onSurfaceVariant },
    fallbackTitle: { color: theme.colors.onSurface, fontWeight: "700", textAlign: "center" },
    fallbackSub: { color: theme.colors.onSurfaceVariant, textAlign: "center", lineHeight: 18 },
    youtubeBtn: { marginTop: 8, backgroundColor: theme.colors.primaryContainer, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
    youtubeBtnText: { color: theme.colors.onPrimaryContainer, fontWeight: "700" },

    lyricsSection: { width: "100%", marginBottom: 28 },
    sectionHeader: { color: theme.colors.onBackground, fontWeight: "700", marginBottom: 8 },
    lyricsText: { color: theme.colors.onSurface, fontFamily: "Nunito_400Regular", fontSize: 14, lineHeight: 24 },
    errorText: { color: theme.colors.error },

    syncedScroll: { height: 320 },
    lyricLineWrapper: { paddingVertical: 6, paddingHorizontal: 4 },
    lyricLine: { color: theme.colors.onSurfaceVariant, fontFamily: "Nunito_400Regular", fontSize: 15, lineHeight: 22, opacity: 0.6 },
    lyricLineActive: { color: theme.colors.onSurface, fontFamily: "Nunito_700Bold", fontSize: 17, opacity: 1 },

    vocabWord: { color: theme.colors.primary, fontFamily: "Nunito_700Bold", textDecorationLine: "underline" },
    definitionBubble: {
      position: "absolute",
      maxWidth: 160,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      paddingHorizontal: 12,
      paddingVertical: 8,
      elevation: 4,
    },
    definitionWord: { color: theme.colors.onSurface, fontFamily: "Nunito_700Bold", fontSize: 12, marginBottom: 2 },
    definitionText: { color: theme.colors.onSurface, fontFamily: "Nunito_400Regular", fontSize: 12 },

    flashcardsSection: { width: "100%", marginBottom: 28 },

    notFound: { color: theme.colors.onSurface, padding: 24 },
  });
