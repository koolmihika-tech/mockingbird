import { useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";
import { AppScaffold } from "./AppScaffold";
import { QuestionCard } from "./QuestionCards";
import { useAppTheme } from "../constants/theme";
import { SONGS } from "../data/songs";
import vocab from "../data/vocabulary.json";
import { generateQuestions, Question } from "../Supabase/services/questions";

type Mode = "reading" | "writing";

/** Dedicated single-mode practice screen for a song — same generateQuestions
 *  + QuestionCard framework used by the song tiles on the Reading & Writing
 *  tab (see app/reading/[id].tsx), just fixed to one mode instead of toggling. */
export function SongPracticeScreen({ songId, mode, title }: { songId: string; mode: Mode; title: string }) {
  const theme = useAppTheme();
  const song = SONGS.find((s) => s.id === songId);

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const words = song ? Object.keys((vocab as Record<string, Record<string, string>>)[song.name] ?? {}) : [];

  async function handleGenerate() {
    if (!song) return;
    setQuestions(null);
    setError(null);
    setLoading(true);
    try {
      const result = await generateQuestions(song.name, words, mode);
      setQuestions(result);
    } catch (e: any) {
      setError(e.message ?? "Could not generate questions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (song && words.length > 0) handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song?.id]);

  if (!song) {
    return (
      <AppScaffold title={title} back>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, padding: 24 }}>
          Song not found.
        </Text>
      </AppScaffold>
    );
  }

  return (
    <AppScaffold title={`${song.displayName ?? song.name} — ${title}`} back>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 20 }}>
          {song.displayName ? song.name : song.artist}
        </Text>

        {words.length === 0 ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.error, textAlign: "center", marginTop: 20 }}>
            No vocabulary available for this song yet.
          </Text>
        ) : loading ? (
          <ActivityIndicator color={theme.colors.primary} style={styles.spinner} />
        ) : error ? (
          <>
            <Text variant="bodyMedium" style={{ color: theme.colors.error, textAlign: "center", marginTop: 20 }}>
              {error}
            </Text>
            <Button mode="contained-tonal" onPress={handleGenerate} style={styles.actionBtn}>
              Try again
            </Button>
          </>
        ) : questions ? (
          <>
            {questions.map((q, i) => (
              <QuestionCard key={i} question={q} />
            ))}
            <Button mode="outlined" onPress={handleGenerate} style={styles.actionBtn}>
              New questions
            </Button>
          </>
        ) : null}
      </ScrollView>
    </AppScaffold>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48 },
  spinner: { marginTop: 20 },
  actionBtn: { alignSelf: "center", marginTop: 12 },
});
