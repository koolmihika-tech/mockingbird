import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Surface, Text } from "react-native-paper";
import { AppScaffold } from "../../components/AppScaffold";
import { useAppTheme, type AppTheme } from "../../constants/theme";
import { SONGS } from "../../data/songs";

// Web keeps the original side-by-side layout; native mobile stacks the
// square on top of the skill rectangles instead of placing them beside it.
const IS_WEB = Platform.OS === "web";

type SkillIcon = keyof typeof MaterialCommunityIcons.glyphMap;
const SKILLS: { label: string; icon: SkillIcon; route?: "reading" | "writing" | "flashcards" }[] = [
  { label: "Reading", icon: "book-open-variant", route: "reading" },
  { label: "Writing", icon: "pencil", route: "writing" },
  { label: "Speaking", icon: "microphone-variant" },
  { label: "Flashcards", icon: "cards-outline", route: "flashcards" },
];

export default function SongHubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = makeStyles(theme);

  const song = SONGS.find((s) => s.id === id);

  if (!song) {
    return (
      <AppScaffold title="Song" back>
        <Text variant="titleMedium" style={styles.notFound}>
          Song not found.
        </Text>
      </AppScaffold>
    );
  }

  return (
    <AppScaffold title={song.displayName ?? song.name} back>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          {/* Song card with a link to the player page — on top for mobile, left for web */}
          <Surface style={[styles.songCard, { backgroundColor: song.coverColor }]} elevation={2}>
            <View style={styles.songCardTop}>
              <MaterialCommunityIcons name="music" size={36} color="#3B2A1F" />
              <Text variant="titleMedium" style={styles.songCardName} numberOfLines={2}>
                {song.displayName ?? song.name}
              </Text>
              {!song.displayName && (
                <Text variant="bodySmall" style={styles.songCardArtist} numberOfLines={1}>
                  {song.artist}
                </Text>
              )}
            </View>

            <Pressable
              style={({ pressed }) => [styles.playButton, pressed && { opacity: 0.85 }]}
              onPress={() => router.push(`/song/${song.id}` as any)}
            >
              <MaterialCommunityIcons name="play-circle" size={22} color={theme.colors.onPrimary} />
              <Text variant="labelLarge" style={{ color: theme.colors.onPrimary }}>
                Play
              </Text>
            </Pressable>
          </Surface>

          {/* Skill panels — Reading/Writing/Flashcards are linked; Speaking isn't yet.
              Stacked beneath the square on mobile, beside it in a column on web. */}
          <View style={styles.skillColumn}>
            {SKILLS.map((skill) => (
              <Surface
                key={skill.label}
                style={[styles.skillRect, { backgroundColor: theme.colors.surfaceVariant }]}
                elevation={0}
              >
                <Pressable
                  style={styles.skillRectInner}
                  disabled={!skill.route}
                  onPress={() => skill.route && router.push(`/songs/${song.id}/${skill.route}` as any)}
                >
                  <MaterialCommunityIcons name={skill.icon} size={20} color={theme.colors.onSurfaceVariant} />
                  <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                    {skill.label}
                  </Text>
                </Pressable>
              </Surface>
            ))}
          </View>
        </View>
      </ScrollView>
    </AppScaffold>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    scrollContent: { flexGrow: 1 },
    container: IS_WEB
      ? { flex: 1, flexDirection: "row", padding: 16, gap: 14 }
      : { flexGrow: 1, flexDirection: "column", padding: 16, gap: 14 },
    notFound: { textAlign: "center", marginTop: 40, color: theme.colors.error },
    songCard: IS_WEB
      ? { flex: 1, aspectRatio: 1, borderRadius: 24, padding: 16, justifyContent: "space-between" }
      : { width: "100%", aspectRatio: 1, borderRadius: 24, padding: 16, justifyContent: "space-between" },
    songCardTop: { gap: 6 },
    songCardName: { color: "#3B2A1F", fontWeight: "800" },
    songCardArtist: { color: "#3B2A1F", opacity: 0.75 },
    playButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      alignSelf: "flex-start",
      backgroundColor: theme.colors.primary,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 999,
    },
    skillColumn: IS_WEB ? { flex: 1, gap: 10 } : { width: "100%", gap: 10 },
    skillRect: IS_WEB ? { flex: 1, borderRadius: 18, overflow: "hidden" } : { height: 68, borderRadius: 18, overflow: "hidden" },
    skillRectInner: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 16,
    },
  });
