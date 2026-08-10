import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, SegmentedButtons, Text } from "react-native-paper";
import { AppScaffold } from "../../components/AppScaffold";
import { QuestionCard } from "../../components/QuestionCards";
import { useAppTheme } from "../../constants/theme";
import { SONGS } from "../../data/songs";
import vocab from "../../data/vocabulary.json";
import { generateQuestions, Question } from "../../Supabase/services/questions";

type Mode = "reading" | "writing";

export default function LessonPracticeScreen() {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const song = SONGS.find((s) => s.id === id);

  const [mode, setMode] = useState<Mode>("reading");
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!song) {
    return (
      <AppScaffold title="Lessons" back>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, padding: 24 }}>
          Song not found.
        </Text>
      </AppScaffold>
    );
  }

  const words = Object.keys((vocab as Record<string, Record<string, string>>)[song.name] ?? {});

  async function handleGenerate(nextMode: Mode) {
    setMode(nextMode);
    setQuestions(null);
    setError(null);
    setLoading(true);
    try {
      const result = await generateQuestions(song!.name, words, nextMode);
      setQuestions(result);
    } catch (e: any) {
      setError(e.message ?? "Could not generate questions.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppScaffold title={song.name} back>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 20 }}>
          {song.artist}
        </Text>

        {words.length === 0 ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.error, textAlign: "center", marginTop: 20 }}>
            No vocabulary available for this song yet.
          </Text>
        ) : (
          <>
            <SegmentedButtons
              value={mode}
              onValueChange={(v) => handleGenerate(v as Mode)}
              buttons={[
                { value: "reading", label: "Reading", icon: "book-open-variant" },
                { value: "writing", label: "Writing", icon: "pencil" },
              ]}
              style={styles.modeRow}
            />

            {loading ? (
              <ActivityIndicator color={theme.colors.primary} style={styles.spinner} />
            ) : error ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.error, textAlign: "center", marginTop: 20 }}>
                {error}
              </Text>
            ) : questions ? (
              questions.map((q, i) => <QuestionCard key={i} question={q} />)
            ) : (
              <View style={styles.hint}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}>
                  Pick Reading or Writing to generate practice questions.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </AppScaffold>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48 },
  modeRow: { marginBottom: 20 },
  spinner: { marginTop: 20 },
  hint: { marginTop: 20 },
});
