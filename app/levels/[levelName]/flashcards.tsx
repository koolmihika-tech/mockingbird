import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { AppScaffold } from "../../../components/AppScaffold";
import { FlashCardCarousel, LEVEL_DECK_COLOR } from "../../../components/FlashCards";
import { useAppTheme, type AppTheme } from "../../../constants/theme";
import { getLevelVocab, LESSON_SUBCATEGORIES } from "../../../data/lessonQuestions";

/** Flashcards for every vocab word in one level's lessons — set up like the
 *  per-song flashcards screen (app/songs/[id]/flashcards.tsx). */
export default function LevelFlashcardsScreen() {
  const { levelName } = useLocalSearchParams<{ levelName: string }>();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const level = LESSON_SUBCATEGORIES.find((s) => s.levelName === levelName);
  const entries = getLevelVocab(levelName);

  return (
    <AppScaffold title={`Level ${levelName} — Flashcards`} back>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="headlineSmall" style={styles.title}>
          Level {levelName}
        </Text>
        {level && (
          <Text variant="bodyMedium" style={styles.subtitle}>
            {level.focusArea}
          </Text>
        )}

        {entries.length > 0 ? (
          <View style={styles.flashcardsSection}>
            <Text variant="titleMedium" style={styles.sectionHeader}>
              Vocabulary
            </Text>
            <FlashCardCarousel entries={entries} color={LEVEL_DECK_COLOR} />
          </View>
        ) : (
          <Text variant="bodyMedium" style={styles.errorText}>
            No vocabulary available for this level yet.
          </Text>
        )}
      </ScrollView>
    </AppScaffold>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { padding: 24, paddingBottom: 48, alignItems: "center" },
    title: { color: theme.colors.onBackground, fontWeight: "800", textAlign: "center", marginTop: 8, marginBottom: 4 },
    subtitle: { color: theme.colors.onSurfaceVariant, textAlign: "center", marginBottom: 20 },
    flashcardsSection: { width: "100%", marginTop: 12 },
    sectionHeader: { color: theme.colors.onBackground, fontWeight: "700", marginBottom: 8 },
    errorText: { color: theme.colors.error, textAlign: "center", marginTop: 20 },
  });
