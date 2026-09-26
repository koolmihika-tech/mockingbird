import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, Text, TouchableRipple } from "react-native-paper";
import { AppScaffold } from "../../components/AppScaffold";
import { useAppTheme } from "../../constants/theme";
import { useSupabaseAuth } from "../../context/SupabaseAuth";
import { SONGS as PLACEHOLDER_SONGS } from "../../data/songs";
import { fetchUserLevel, type Level } from "../../Supabase/services/levels";

export default function SongsScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { user } = useSupabaseAuth();
  const [userLevel, setUserLevel] = useState<Level | null>(null);
  const [loadingLevel, setLoadingLevel] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoadingLevel(false);
      return;
    }
    fetchUserLevel(user.id)
      .then(setUserLevel)
      .catch(() => setUserLevel(null))
      .finally(() => setLoadingLevel(false));
  }, [user]);

  const visibleSongs = useMemo(() => {
    if (!userLevel) return PLACEHOLDER_SONGS;
    return PLACEHOLDER_SONGS.filter((song) => song.level === userLevel.level_name);
  }, [userLevel]);

  return (
    <AppScaffold title="Songs">
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {loadingLevel ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 20 }} />
        ) : visibleSongs.length === 0 ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            No songs available for your level yet.
          </Text>
        ) : (
          visibleSongs.map((song) => (
            <Card
              key={song.id}
              mode="outlined"
              style={[styles.songRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
            >
              <TouchableRipple onPress={() => router.push(`/songs/${song.id}` as any)} style={styles.songRipple} borderless>
                <View style={styles.songRowInner}>
                  <View style={[styles.songThumb, { backgroundColor: song.coverColor }]}>
                    <MaterialCommunityIcons name="music" size={22} color="#3B2A1F" />
                  </View>
                  <View style={styles.songInfo}>
                    <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
                      {song.displayName ?? song.name}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {song.displayName ? "—" : song.artist}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
                </View>
              </TouchableRipple>
            </Card>
          ))
        )}
      </ScrollView>
    </AppScaffold>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  songRow: { borderRadius: 18, marginBottom: 10 },
  songRipple: { borderRadius: 18 },
  songRowInner: { flexDirection: "row", alignItems: "center", padding: 10, gap: 12 },
  songThumb: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  songInfo: { flex: 1 },
});
