import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { Surface, Text, TouchableRipple } from "react-native-paper";
import { AppScaffold } from "./AppScaffold";
import { useAppTheme } from "../constants/theme";
import { SONGS } from "../data/songs";

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;

/** Song list for a practice pathway on the Practice tab (Listening, Speaking).
 *  Each tile opens that skill's per-song page at /songs/[id]/<route>, the same
 *  way the "Flashcards by song" carousel links to /songs/[id]/flashcards. */
export function SongPickerScreen({
  title,
  subtitle,
  route,
  icon,
}: {
  title: string;
  subtitle: string;
  route: "listening" | "speaking";
  icon: Icon;
}) {
  const router = useRouter();
  const theme = useAppTheme();

  return (
    <AppScaffold title={title} back>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          {subtitle}
        </Text>
        <View style={styles.grid}>
          {SONGS.filter((s) => !s.displayName).map((song) => (
            <TouchableRipple
              key={song.id}
              onPress={() => router.push(`/songs/${song.id}/${route}` as any)}
              style={styles.songTile}
              borderless
            >
              <View style={{ alignItems: "center" }}>
                <Surface style={[styles.songCover, { backgroundColor: song.coverColor }]} elevation={1}>
                  <MaterialCommunityIcons name={icon} size={30} color="#3B2A1F" />
                </Surface>
                <Text variant="labelMedium" numberOfLines={1} style={[styles.songTileName, { color: theme.colors.onBackground }]}>
                  {song.name}
                </Text>
                <Text variant="bodySmall" numberOfLines={1} style={[styles.songTileName, { color: theme.colors.onSurfaceVariant }]}>
                  {song.artist}
                </Text>
              </View>
            </TouchableRipple>
          ))}
        </View>
      </ScrollView>
    </AppScaffold>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 8, paddingBottom: 28, paddingHorizontal: 16 },
  subtitle: { marginHorizontal: 4, marginTop: 8, marginBottom: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 16 },
  songTile: { width: 100, borderRadius: 20 },
  songCover: { width: 92, height: 92, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  songTileName: { textAlign: "center", width: 92 },
});
