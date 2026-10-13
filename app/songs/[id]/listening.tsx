import { MaterialCommunityIcons } from "@expo/vector-icons";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Surface, Text } from "react-native-paper";
import { AppScaffold } from "../../../components/AppScaffold";
import { useAppTheme, type AppTheme } from "../../../constants/theme";
import { clipFor, LISTENING_ITEMS, type ListeningItem } from "../../../data/listening";
import { SONGS } from "../../../data/songs";

/** Slow-mode playback speed (1 is normal). */
const SLOW_RATE = 0.7;
/** Chance a question is a phrase rather than a single word, when both exist. */
const PHRASE_SHARE = 0.35;

const shuffle = <T,>(a: T[]): T[] => {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** Per-song listening practice — hear a word or short phrase from the song
 *  (a pre-generated clip, never synthesised on the fly) and pick which of two
 *  look-alike options you heard, e.g. "coro" vs "corso". Set up like the other
 *  per-song screens (app/songs/[id]/flashcards.tsx, speaking.tsx). */
export default function SongListeningScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const song = SONGS.find((s) => s.id === id);

  const items = useMemo(() => LISTENING_ITEMS.filter((i) => i.songId === id), [id]);

  const [current, setCurrent] = useState<ListeningItem | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  // Session tally.
  const [attempted, setAttempted] = useState(0);
  const [correct, setCorrect] = useState(0);

  const seen = useRef(new Set<string>());
  const autoPlay = useRef(false);

  const player = useAudioPlayer(null);
  const { playing } = useAudioPlayerStatus(player);

  // Next unseen item, mixing words and phrases; start over once all are seen.
  const pickNext = useCallback((): ListeningItem | null => {
    if (items.length === 0) return null;
    let unseen = items.filter((i) => !seen.current.has(i.id));
    if (unseen.length === 0) {
      seen.current.clear();
      unseen = items;
    }
    const phrases = unseen.filter((i) => i.kind === "phrase");
    const words = unseen.filter((i) => i.kind === "word");
    const wantPhrase = phrases.length > 0 && (words.length === 0 || Math.random() < PHRASE_SHARE);
    const pool = wantPhrase ? phrases : words;
    const next = pool[Math.floor(Math.random() * pool.length)];
    seen.current.add(next.id);
    return next;
  }, [items]);

  const startItem = useCallback((item: ListeningItem | null, play: boolean) => {
    autoPlay.current = play;
    setCurrent(item);
    setOptions(item ? shuffle([item.text, item.distractor]) : []);
    setSelected(null);
  }, []);

  // First question when the song loads.
  useEffect(() => {
    seen.current.clear();
    startItem(pickNext(), false);
    setAttempted(0);
    setCorrect(0);
    void setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
  }, [id, pickNext, startItem]);

  const play = useCallback(() => {
    if (!current) return;
    try {
      player.playbackRate = slow ? SLOW_RATE : 1;
    } catch {
      // Rate control isn't available everywhere; play at normal speed.
    }
    void player.seekTo(0);
    player.play();
  }, [current, player, slow]);

  // Load the clip for each new question; auto-play it when advancing.
  useEffect(() => {
    if (!current) return;
    const src = clipFor(current);
    if (src === undefined) return;
    player.replace(src);
    if (autoPlay.current) {
      autoPlay.current = false;
      play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, player]);

  const togglePlay = () => {
    if (playing) {
      player.pause();
      void player.seekTo(0);
    } else {
      play();
    }
  };

  const choose = (option: string) => {
    if (!current || selected) return;
    setSelected(option);
    setAttempted((n) => n + 1);
    if (option === current.text) setCorrect((n) => n + 1);
  };

  if (!song) {
    return (
      <AppScaffold title="Listening" back>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, padding: 24 }}>
          Song not found.
        </Text>
      </AppScaffold>
    );
  }

  const answered = selected !== null;
  const isRight = answered && selected === current?.text;

  return (
    <AppScaffold title={`${song.displayName ?? song.name} — Listening`} back>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="headlineSmall" style={styles.songName}>
          {song.displayName ?? song.name}
        </Text>
        {!song.displayName && (
          <Text variant="bodyMedium" style={styles.songArtist}>
            {song.artist}
          </Text>
        )}

        {!current ? (
          <Text variant="bodyMedium" style={styles.emptyText}>
            Listening practice isn&apos;t available for this song yet.
          </Text>
        ) : (
          <>
            {/* Play the clip */}
            <Surface style={styles.listenBox} elevation={1}>
              <Text variant="titleMedium" style={styles.sectionHeader}>
                {current.kind === "phrase" ? "Listen to the phrase" : "Listen to the word"}
              </Text>
              <Pressable
                onPress={togglePlay}
                style={({ pressed }) => [styles.playButton, playing && styles.playButtonActive, pressed && { opacity: 0.85 }]}
                accessibilityLabel={playing ? "Stop" : "Play"}
              >
                <MaterialCommunityIcons name={playing ? "stop" : "volume-high"} size={32} color={theme.colors.onPrimary} />
              </Pressable>
              <Text variant="labelLarge" style={styles.playLabel}>
                {playing ? "Playing… tap to stop" : "Tap to play"}
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
            </Surface>

            {/* Pick what you heard */}
            <Text variant="titleMedium" style={[styles.sectionHeader, styles.question]}>
              What did you hear?
            </Text>
            <View style={styles.options}>
              {options.map((option) => {
                const isAnswer = option === current.text;
                const isPicked = option === selected;
                const state = !answered ? "idle" : isAnswer ? "right" : isPicked ? "wrong" : "dim";
                return (
                  <Pressable
                    key={option}
                    onPress={() => choose(option)}
                    disabled={answered}
                    style={({ pressed }) => [styles.option, styles[`option_${state}`], pressed && { opacity: 0.85 }]}
                  >
                    <Text variant="titleLarge" style={[styles.optionText, styles[`optionText_${state}`]]}>
                      {option}
                    </Text>
                    {state === "right" && <MaterialCommunityIcons name="check-circle" size={22} color={theme.colors.onSuccess} />}
                    {state === "wrong" && (
                      <MaterialCommunityIcons name="close-circle" size={22} color={theme.colors.onErrorContainer} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {answered && (
              <Surface style={styles.feedback} elevation={1}>
                <Text variant="titleMedium" style={{ color: isRight ? theme.colors.success : theme.colors.error, fontWeight: "800" }}>
                  {isRight ? "Correct!" : `Not quite — it was “${current.text}”`}
                </Text>
                {current.gloss ? (
                  <Text variant="bodyMedium" style={styles.gloss}>
                    {current.text}: {current.gloss}
                  </Text>
                ) : null}
                <View style={styles.feedbackActions}>
                  <Button mode="outlined" icon="volume-high" onPress={play}>
                    Hear it again
                  </Button>
                  <Button mode="contained" icon="arrow-right" onPress={() => startItem(pickNext(), true)}>
                    Next
                  </Button>
                </View>
              </Surface>
            )}

            {attempted > 0 && (
              <Text variant="bodySmall" style={styles.tally}>
                This session: {correct} of {attempted} correct
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
    emptyText: { color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 32 },

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

    question: { alignSelf: "flex-start", marginBottom: 10 },
    options: { width: "100%", gap: 12 },
    option: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      minHeight: 64,
      borderRadius: 16,
      borderWidth: 1.5,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    option_idle: { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
    option_right: { backgroundColor: theme.colors.success, borderColor: theme.colors.success },
    option_wrong: { backgroundColor: theme.colors.errorContainer, borderColor: theme.colors.error },
    option_dim: { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, opacity: 0.5 },
    optionText: { fontWeight: "700", textAlign: "center" },
    optionText_idle: { color: theme.colors.onSurface },
    optionText_right: { color: theme.colors.onSuccess },
    optionText_wrong: { color: theme.colors.onErrorContainer },
    optionText_dim: { color: theme.colors.onSurface },

    feedback: {
      width: "100%",
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      gap: 8,
      marginTop: 20,
    },
    gloss: { color: theme.colors.onSurfaceVariant },
    feedbackActions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 8 },
    tally: { color: theme.colors.onSurfaceVariant, marginTop: 16 },
  });
