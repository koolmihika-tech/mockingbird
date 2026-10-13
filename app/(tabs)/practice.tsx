import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Surface, Text, TouchableRipple } from "react-native-paper";
import { AppScaffold } from "../../components/AppScaffold";
import { LevelCarousel } from "../../components/LevelCarousel";
import { useAppTheme } from "../../constants/theme";
import { useLevelProgress } from "../../hooks/useLevelProgress";

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;
type Tone = "primary" | "tertiary" | "secondary" | "streak";
const DECKS: { label: string; sub: string; route: string; icon: Icon; tone: Tone }[] = [
  { label: "Reading & Writing", sub: "Lessons from the language", route: "/lessons", icon: "book-open-variant", tone: "primary" },
  { label: "Listening", sub: "Tune your ear", route: "/listening", icon: "headphones", tone: "secondary" },
  { label: "Speaking", sub: "Say it out loud", route: "/speaking", icon: "microphone-variant", tone: "streak" },
];

export default function PracticeScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { levels, loading, error, userLevel, statusOf, isLevelLocked } = useLevelProgress();

  const toneColor = (t: Tone) =>
    t === "primary"
      ? theme.colors.primaryContainer
      : t === "tertiary"
      ? theme.colors.tertiaryContainer
      : t === "secondary"
      ? theme.colors.secondaryContainer
      : theme.colors.streakContainer;
  const onToneColor = (t: Tone) =>
    t === "primary"
      ? theme.colors.onPrimaryContainer
      : t === "tertiary"
      ? theme.colors.onTertiaryContainer
      : t === "secondary"
      ? theme.colors.onSecondaryContainer
      : theme.colors.onStreakContainer;

  return (
    <AppScaffold title="Practice">
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Flashcards: one deck per level, compiled from its lessons' vocab */}
        <Text variant="titleMedium" style={[styles.sectionLabel, styles.firstSectionLabel, { color: theme.colors.onBackground }]}>
          Flashcards
        </Text>
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={styles.spinner} />
        ) : error ? (
          <Text variant="bodyMedium" style={[styles.errorText, { color: theme.colors.error }]}>
            {error}
          </Text>
        ) : (
          <LevelCarousel
            levels={levels}
            statusOf={statusOf}
            isLevelLocked={isLevelLocked}
            initialLevelName={userLevel?.level_name}
            onPressCard={(level) => router.push(`/levels/${level.levelName}/flashcards` as any)}
          />
        )}

        {/* Decks */}
        <Text variant="titleMedium" style={[styles.sectionLabel, { color: theme.colors.onBackground }]}>
          Practice Pathways
        </Text>
        {DECKS.map((deck) => {
          const inner = (
            <View style={styles.deckInner}>
              <MaterialCommunityIcons name={deck.icon} size={26} color={onToneColor(deck.tone)} />
              <View style={{ flex: 1 }}>
                <Text variant="titleSmall" style={{ color: onToneColor(deck.tone) }}>
                  {deck.label}
                </Text>
                <Text variant="bodySmall" style={{ color: onToneColor(deck.tone), opacity: 0.85 }}>
                  {deck.sub}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={onToneColor(deck.tone)} />
            </View>
          );
          return (
            <Surface key={deck.label} elevation={0} style={[styles.deck, { backgroundColor: toneColor(deck.tone) }]}>
              <TouchableRipple onPress={() => router.push(deck.route as any)} style={styles.deckRipple}>
                {inner}
              </TouchableRipple>
            </Surface>
          );
        })}
      </ScrollView>
    </AppScaffold>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 8, paddingBottom: 28 },
  sectionLabel: { marginHorizontal: 20, marginTop: 26, marginBottom: 12 },
  firstSectionLabel: { marginTop: 12 },
  spinner: { marginVertical: 24 },
  errorText: { textAlign: "center", marginVertical: 24 },
  deck: { marginHorizontal: 16, borderRadius: 20, marginBottom: 12 },
  deckRipple: { borderRadius: 20 },
  deckInner: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
});
