import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Surface, Text, TextInput } from "react-native-paper";
import { getLyrics, parseSyncedLyrics } from "../../../api/lrclib";
import { AppScaffold } from "../../../components/AppScaffold";
import { useAppTheme, type AppTheme } from "../../../constants/theme";
import { SONGS } from "../../../data/songs";
import { useSpeakLine } from "../../../hooks/useSpeakLine";

type WordResult = { word: string; status: "correct" | "accent" | "missed" };

/** Lowercase and drop punctuation; keeps accents. */
const clean = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
/** clean() with accents (and ñ → n) stripped, for lenient matching. */
const base = (w: string) => clean(w).normalize("NFD").replace(/\p{M}/gu, "");

/** Lines up the typed words against the lyric with a longest-common-subsequence
 *  match on accent-free words, then marks each lyric word as correct, right
 *  but missing/misplacing an accent, or missed. */
function gradeDictation(lyric: string, typed: string): WordResult[] {
  const expected = lyric.split(/\s+/).filter((w) => clean(w).length > 0);
  const heard = typed.split(/\s+/).filter((w) => clean(w).length > 0);
  const a = expected.map(base);
  const b = heard.map(base);

  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const results: WordResult[] = expected.map((word) => ({ word, status: "missed" }));
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      results[i].status = clean(expected[i]) === clean(heard[j]) ? "correct" : "accent";
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return results;
}

/** Per-song listening practice — a random lyric line is read aloud by a
 *  Spanish (Mexico) TTS voice and the learner types what they heard, then
 *  sees which words they caught. Set up like the per-song flashcards and
 *  speaking screens (app/songs/[id]/flashcards.tsx, speaking.tsx). */
export default function SongListeningScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const song = SONGS.find((s) => s.id === id);

  const [lines, setLines] = useState<string[] | null>(null);
  const [lyric, setLyric] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typed, setTyped] = useState("");
  const [results, setResults] = useState<WordResult[] | null>(null);
  const [revealed, setRevealed] = useState(false);
  // Session tally: lines checked and lines heard perfectly (accents forgiven).
  const [attempted, setAttempted] = useState(0);
  const [perfect, setPerfect] = useState(0);

  const { speak, stop: stopSpeech, speaking, hasVoice, voicesLoaded } = useSpeakLine();
  const [slow, setSlow] = useState(false);

  const pickRandomLine = useCallback((pool: string[], current?: string | null) => {
    if (pool.length === 0) return null;
    if (pool.length === 1) return pool[0];
    let next = current;
    while (next === current) next = pool[Math.floor(Math.random() * pool.length)];
    return next ?? null;
  }, []);

  const nextLine = useCallback(() => {
    stopSpeech();
    if (lines) setLyric((cur) => pickRandomLine(lines, cur));
    setTyped("");
    setResults(null);
    setRevealed(false);
  }, [lines, pickRandomLine, stopSpeech]);

  const check = useCallback(() => {
    if (!lyric || typed.trim().length === 0) return;
    stopSpeech();
    const graded = gradeDictation(lyric, typed);
    setResults(graded);
    setRevealed(true);
    setAttempted((n) => n + 1);
    if (graded.every((w) => w.status !== "missed")) setPerfect((n) => n + 1);
  }, [lyric, typed, stopSpeech]);

  useEffect(() => {
    if (!song) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setLines(null);
    setLyric(null);

    getLyrics(song.name, song.artist)
      .then((result) => {
        if (cancelled) return;
        const raw = result?.syncedLyrics
          ? parseSyncedLyrics(result.syncedLyrics).map((l) => l.text)
          : (result?.plainLyrics ?? "").split("\n");
        // Dedupe so a repeated chorus line doesn't dominate the pool.
        const pool = [...new Set(raw.map((l) => l.trim()).filter((l) => l.length > 0))];
        if (pool.length === 0) {
          setError("No lyrics available for this song yet.");
          return;
        }
        setLines(pool);
        setLyric(pickRandomLine(pool));
      })
      .catch(() => {
        if (!cancelled) setError("Could not load lyrics.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [song?.id, pickRandomLine]);

  if (!song) {
    return (
      <AppScaffold title="Listening" back>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, padding: 24 }}>
          Song not found.
        </Text>
      </AppScaffold>
    );
  }

  const caught = results ? results.filter((w) => w.status !== "missed").length : 0;
  const score = results && results.length > 0 ? Math.round((caught / results.length) * 100) : 0;
  const wordColor = (status: WordResult["status"]) =>
    status === "correct" ? theme.colors.success : status === "accent" ? theme.colors.streak : theme.colors.error;

  return (
    <AppScaffold title={`${song.displayName ?? song.name} — Listening`} back>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text variant="headlineSmall" style={styles.songName}>
          {song.displayName ?? song.name}
        </Text>
        {!song.displayName && (
          <Text variant="bodyMedium" style={styles.songArtist}>
            {song.artist}
          </Text>
        )}

        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 32 }} />
        ) : error ? (
          <Text variant="bodyMedium" style={styles.errorText}>
            {error}
          </Text>
        ) : (
          <>
            {/* Play the hidden line */}
            <Surface style={styles.listenBox} elevation={1}>
              <View style={styles.listenHeaderRow}>
                <Text variant="titleMedium" style={styles.sectionHeader}>
                  Listen to the line
                </Text>
                <Pressable
                  onPress={nextLine}
                  style={({ pressed }) => [styles.shuffleBtn, pressed && { opacity: 0.6 }]}
                  hitSlop={8}
                >
                  <MaterialCommunityIcons name="shuffle-variant" size={18} color={theme.colors.onSurfaceVariant} />
                </Pressable>
              </View>
              <Pressable
                onPress={() => (speaking ? stopSpeech() : lyric && speak(lyric, slow))}
                disabled={!lyric}
                style={({ pressed }) => [styles.playButton, speaking && styles.playButtonActive, pressed && { opacity: 0.85 }]}
              >
                <MaterialCommunityIcons
                  name={speaking ? "stop" : "volume-high"}
                  size={32}
                  color={theme.colors.onPrimary}
                />
              </Pressable>
              <Text variant="labelLarge" style={styles.playLabel}>
                {speaking ? "Playing… tap to stop" : "Tap to play"}
              </Text>
              <Pressable
                onPress={() => setSlow((v) => !v)}
                style={({ pressed }) => [styles.slowToggle, slow && styles.slowToggleOn, pressed && { opacity: 0.85 }]}
                hitSlop={6}
                accessibilityRole="switch"
                accessibilityState={{ checked: slow }}
              >
                <MaterialCommunityIcons
                  name="tortoise"
                  size={16}
                  color={slow ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
                />
                <Text variant="labelMedium" style={{ color: slow ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }}>
                  Slow
                </Text>
              </Pressable>
              {voicesLoaded && !hasVoice && Platform.OS === "android" && (
                <Text variant="bodySmall" style={styles.voiceHint}>
                  For the best pronunciation, install a Spanish (Mexico) voice in Settings → Text-to-speech.
                </Text>
              )}
            </Surface>

            {/* Type what you heard */}
            <View style={styles.answerSection}>
              <Text variant="titleMedium" style={[styles.sectionHeader, { marginBottom: 8 }]}>
                What did you hear?
              </Text>
              <TextInput
                mode="outlined"
                value={typed}
                onChangeText={(t) => {
                  setTyped(t);
                  if (results) setResults(null);
                }}
                placeholder="Type the line in Spanish"
                autoCapitalize="none"
                autoCorrect={false}
                multiline
                onSubmitEditing={check}
                submitBehavior="blurAndSubmit"
                style={styles.input}
              />
              <View style={styles.answerActions}>
                <Button mode="contained" onPress={check} disabled={typed.trim().length === 0}>
                  Check
                </Button>
                {!revealed && (
                  <Button mode="text" onPress={() => setRevealed(true)}>
                    Show line
                  </Button>
                )}
                {revealed && (
                  <Button mode="outlined" icon="arrow-right" onPress={nextLine}>
                    Next line
                  </Button>
                )}
              </View>
            </View>

            {/* Result */}
            {revealed && (
              <Surface style={styles.resultBox} elevation={1}>
                {results && (
                  <View style={styles.scoreRow}>
                    <Text variant="headlineMedium" style={[styles.score, { color: score === 100 ? theme.colors.success : theme.colors.onSurface }]}>
                      {score}%
                    </Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                      {caught} of {results.length} words caught
                    </Text>
                  </View>
                )}
                <Text variant="titleLarge" style={styles.lyricText}>
                  {results
                    ? results.map((w, i) => (
                        <Text key={i} style={{ color: wordColor(w.status) }}>
                          {w.word}
                          {i < results.length - 1 ? " " : ""}
                        </Text>
                      ))
                    : lyric}
                </Text>
                {results && results.some((w) => w.status === "accent") && (
                  <Text variant="bodySmall" style={styles.accentHint}>
                    Words in amber are right but missing an accent or tilde.
                  </Text>
                )}
              </Surface>
            )}

            {attempted > 0 && (
              <Text variant="bodySmall" style={styles.tally}>
                This session: {perfect} of {attempted} lines heard perfectly
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </AppScaffold>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { padding: 24, paddingBottom: 48, alignItems: "center" },
    songName: { color: theme.colors.onBackground, fontWeight: "800", textAlign: "center", marginTop: 8, marginBottom: 4 },
    songArtist: { color: theme.colors.onSurfaceVariant, textAlign: "center", marginBottom: 20 },
    sectionHeader: { color: theme.colors.onBackground, fontWeight: "700" },

    listenBox: {
      width: "100%",
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      paddingVertical: 20,
      paddingHorizontal: 16,
      alignItems: "center",
      gap: 12,
      marginTop: 12,
      marginBottom: 24,
    },
    listenHeaderRow: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    shuffleBtn: { padding: 4 },
    playButton: {
      width: 72,
      height: 72,
      borderRadius: 999,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    playButtonActive: { backgroundColor: theme.colors.secondary },
    playLabel: { color: theme.colors.onSurfaceVariant, fontWeight: "600" },
    slowToggle: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    slowToggleOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    voiceHint: { color: theme.colors.onSurfaceVariant, textAlign: "center" },

    answerSection: { width: "100%", marginBottom: 20 },
    input: { backgroundColor: theme.colors.surface },
    answerActions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 12 },

    resultBox: {
      width: "100%",
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      gap: 10,
    },
    scoreRow: { flexDirection: "row", alignItems: "baseline", gap: 10 },
    score: { fontWeight: "800" },
    lyricText: { color: theme.colors.onSurface, fontWeight: "800", lineHeight: 30 },
    accentHint: { color: theme.colors.onSurfaceVariant },
    tally: { color: theme.colors.onSurfaceVariant, marginTop: 16 },

    errorText: { color: theme.colors.error, textAlign: "center", marginTop: 32 },
  });
