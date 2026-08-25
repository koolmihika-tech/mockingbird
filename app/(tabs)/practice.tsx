import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Surface, Text, TouchableRipple } from "react-native-paper";
import { AppScaffold } from "../../components/AppScaffold";
import { useAppTheme } from "../../constants/theme";
import { SONGS } from "../../data/songs";

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;
type Tone = "primary" | "tertiary" | "secondary" | "streak";
const DECKS: { label: string; sub: string; route: string; icon: Icon; tone: Tone; comingSoon?: boolean }[] = [
  { label: "Reading & Writing", sub: "Flashcards from your songs", route: "/lessons", icon: "book-open-variant", tone: "primary" },
  { label: "Listening", sub: "Tune your ear", route: "/listening", icon: "headphones", tone: "secondary", comingSoon: true },
  { label: "Speaking", sub: "Say it out loud", route: "/speaking", icon: "microphone-variant", tone: "streak", comingSoon: true },
];

export default function PracticeScreen() {
  const router = useRouter();
  const theme = useAppTheme();

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
        {/* Today's practice hero */}
        <Card mode="contained" style={[styles.hero, { backgroundColor: theme.colors.primaryContainer }]}>
          <Card.Content>
            <View style={styles.heroRow}>
              <View style={{ flex: 1 }}>
                <Text variant="labelLarge" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.8 }}>
                  TODAY&apos;S PRACTICE
                </Text>
                <Text variant="titleLarge" style={{ color: theme.colors.onPrimaryContainer, marginTop: 4 }}>
                  Vocabulary flashcards
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.85, marginTop: 4 }}>
                  Learn new words from the songs you love.
                </Text>
                <Button mode="contained-tonal" icon="play" onPress={() => router.push("/lessons")} style={styles.heroBtn}>
                  Start
                </Button>
              </View>
              <MaterialCommunityIcons name="cards-playing-outline" size={60} color={theme.colors.onPrimaryContainer} style={{ opacity: 0.85 }} />
            </View>
          </Card.Content>
        </Card>

        {/* Decks */}
        <Text variant="titleMedium" style={[styles.sectionLabel, { color: theme.colors.onBackground }]}>
          Practice Pathways
        </Text>
        {DECKS.map((deck) => {
          const inner = (
            <View style={[styles.deckInner, deck.comingSoon && styles.deckComingSoon]}>
              <MaterialCommunityIcons name={deck.icon} size={26} color={onToneColor(deck.tone)} />
              <View style={{ flex: 1 }}>
                <Text variant="titleSmall" style={{ color: onToneColor(deck.tone) }}>
                  {deck.label}
                </Text>
                <Text variant="bodySmall" style={{ color: onToneColor(deck.tone), opacity: 0.85 }}>
                  {deck.sub}
                </Text>
              </View>
              {deck.comingSoon && (
                <Text variant="labelMedium" style={{ color: onToneColor(deck.tone), opacity: 0.9 }}>
                  Coming soon
                </Text>
              )}
              <MaterialCommunityIcons name="chevron-right" size={24} color={onToneColor(deck.tone)} />
            </View>
          );
          return (
            <Surface key={deck.label} elevation={0} style={[styles.deck, { backgroundColor: toneColor(deck.tone) }]}>
              {deck.comingSoon ? (
                inner
              ) : (
                <TouchableRipple onPress={() => router.push(deck.route as any)} style={styles.deckRipple}>
                  {inner}
                </TouchableRipple>
              )}
            </Surface>
          );
        })}

        {/* Flashcards by song */}
        <Text variant="titleMedium" style={[styles.sectionLabel, { color: theme.colors.onBackground }]}>
          Flashcards by song
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselContent}>
          {SONGS.filter((s) => !s.displayName).map((song) => (
            <TouchableRipple
              key={song.id}
              onPress={() => router.push(`/reading/${song.id}` as any)}
              style={styles.songTile}
              borderless
            >
              <View style={{ alignItems: "center" }}>
                <Surface style={[styles.songCover, { backgroundColor: song.coverColor }]} elevation={1}>
                  <MaterialCommunityIcons name="cards-outline" size={30} color="#3B2A1F" />
                </Surface>
                <Text variant="labelMedium" numberOfLines={1} style={[styles.songTileName, { color: theme.colors.onBackground }]}>
                  {song.name}
                </Text>
              </View>
            </TouchableRipple>
          ))}
        </ScrollView>
      </ScrollView>
    </AppScaffold>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 8, paddingBottom: 28 },
  hero: { marginHorizontal: 16, borderRadius: 24 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroBtn: { marginTop: 16, alignSelf: "flex-start" },
  sectionLabel: { marginHorizontal: 20, marginTop: 26, marginBottom: 12 },
  deck: { marginHorizontal: 16, borderRadius: 20, marginBottom: 12 },
  deckRipple: { borderRadius: 20 },
  deckInner: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  deckComingSoon: { opacity: 0.6 },
  carouselContent: { paddingHorizontal: 20, gap: 16 },
  songTile: { width: 100, borderRadius: 20 },
  songCover: { width: 92, height: 92, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  songTileName: { textAlign: "center", width: 92 },
});
