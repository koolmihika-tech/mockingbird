import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { AppScaffold } from "../../../components/AppScaffold";
import { FlashCardCarousel } from "../../../components/FlashCards";
import { useAppTheme, type AppTheme } from "../../../constants/theme";
import { SONGS } from "../../../data/songs";
import vocab from "../../../data/vocabulary.json";

export default function SongFlashcardsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const song = SONGS.find((s) => s.id === id);

  if (!song) {
    return (
      <AppScaffold title="Flashcards" back>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, padding: 24 }}>
          Song not found.
        </Text>
      </AppScaffold>
    );
  }

  const songVocab = (vocab as Record<string, Record<string, string>>)[song.name] ?? {};
  const vocabEntries = Object.entries(songVocab);

  return (
    <AppScaffold title={`${song.displayName ?? song.name} — Flashcards`} back>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="headlineSmall" style={styles.songName}>
          {song.displayName ?? song.name}
        </Text>
        {!song.displayName && (
          <Text variant="bodyMedium" style={styles.songArtist}>
            {song.artist}
          </Text>
        )}

        {vocabEntries.length > 0 ? (
          <View style={styles.flashcardsSection}>
            <Text variant="titleMedium" style={styles.sectionHeader}>
              Vocabulary
            </Text>
            <FlashCardCarousel entries={vocabEntries} color={song.coverColor} />
          </View>
        ) : (
          <Text variant="bodyMedium" style={styles.errorText}>
            No vocabulary available for this song yet.
          </Text>
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
    flashcardsSection: { width: "100%", marginTop: 12 },
    sectionHeader: { color: theme.colors.onBackground, fontWeight: "700", marginBottom: 8 },
    errorText: { color: theme.colors.error, textAlign: "center", marginTop: 20 },
  });
