import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Appbar, Avatar, Button, Card, Chip, ProgressBar, Surface, Text } from "react-native-paper";
import { AppScaffold } from "../../components/AppScaffold";
import { MasteryDial } from "../../components/MasteryDial";
import { useAppTheme, withAlpha } from "../../constants/theme";
import { useSupabaseAuth } from "../../context/SupabaseAuth";
import { fetchAvatars, fetchUserAvatar } from "../../Supabase/services/avatars";
import { fetchUserGenres, type Genre } from "../../Supabase/services/genres";
import { fetchUserLevel, type Level } from "../../Supabase/services/levels";
import { fetchTopicMastery, type TopicMastery } from "../../Supabase/services/mastery";
import { getLoginStreak } from "../../Supabase/services/streak";

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { user, logout } = useSupabaseAuth();
  const [level, setLevel] = useState<Level | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [streak, setStreak] = useState<number | null>(null);
  const [mastery, setMastery] = useState<TopicMastery[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLevel(null);
      setGenres([]);
      setStreak(null);
      setMastery([]);
      setAvatarUrl(undefined);
      setLoading(false);
      return;
    }
    Promise.all([
      fetchUserLevel(user.id),
      fetchUserGenres(user.id),
      getLoginStreak(user.id),
      fetchTopicMastery(user.id),
      fetchAvatars(),
      fetchUserAvatar(user.id),
    ])
      .then(([levelData, genreData, streakData, masteryData, avatarCatalogue, avatarTitle]) => {
        setLevel(levelData);
        setGenres(genreData);
        setStreak(streakData);
        setMastery(masteryData);
        const chosen = avatarCatalogue.find((a) => a.title === avatarTitle);
        setAvatarUrl(chosen?.image_url ?? (user.user_metadata?.avatar_url as string | undefined));
      })
      .catch(() => Alert.alert("Error", "Could not load your profile."))
      .finally(() => setLoading(false));
  }, [user]);

  const displayName = user?.user_metadata?.display_name ?? "—";
  // Weekly streak goal used purely for the visual progress bar.
  const streakGoal = 7;
  const streakProgress = Math.min((streak ?? 0) / streakGoal, 1);

  return (
    <AppScaffold
      title="Profile"
      rightActions={<Appbar.Action icon="pencil" onPress={() => router.push("/preferences")} accessibilityLabel="Edit preferences" />}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Identity */}
          <View style={styles.identity}>
            {avatarUrl ? (
              <Avatar.Image size={72} source={{ uri: avatarUrl }} style={{ backgroundColor: theme.colors.surfaceVariant }} />
            ) : (
              <Avatar.Icon size={72} icon="account" style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.onPrimaryContainer} />
            )}
            <Text variant="titleLarge" style={{ color: theme.colors.onBackground, marginTop: 12 }}>
              {displayName}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {level ? `Level ${level.level_name}` : user ? "Level not set" : "—"}
            </Text>
          </View>

          {/* Progress */}
          <Card mode="contained" style={[styles.card, { backgroundColor: theme.colors.primaryContainer }]}>
            <Card.Content>
              <View style={styles.progressHeader}>
                <View style={styles.streakBadge}>
                  <View style={[styles.streakIcon, { backgroundColor: withAlpha(theme.colors.streak, 0.22) }]}>
                    <MaterialCommunityIcons name="fire" size={22} color={theme.colors.streak} />
                  </View>
                  <Text variant="titleMedium" style={{ color: theme.colors.onPrimaryContainer }}>
                    {streak ?? 0} day streak
                  </Text>
                </View>
                <Text variant="labelMedium" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.85 }}>
                  {streak ?? 0}/{streakGoal} this week
                </Text>
              </View>
              <ProgressBar
                progress={streakProgress}
                color={theme.colors.streak}
                style={[styles.progressBar, { backgroundColor: withAlpha(theme.colors.onPrimaryContainer, 0.15) }]}
              />
            </Card.Content>
          </Card>

          {/* Mastery */}
          <Text variant="titleMedium" style={[styles.sectionLabel, { color: theme.colors.onBackground }]}>
            Mastery
          </Text>
          {mastery.length > 0 ? (
            <View style={styles.masteryWrap}>
              {mastery.map((topic) => (
                <MasteryDial
                  key={topic.focusArea}
                  topic={topic.focusArea}
                  accuracy={topic.accuracy}
                  onPressDetails={() =>
                    router.push({ pathname: "/mastery/[focusArea]", params: { focusArea: topic.focusArea } } as any)
                  }
                />
              ))}
            </View>
          ) : (
            <Surface style={[styles.emptyCard, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {user ? "Complete a lesson to start tracking your mastery." : "—"}
              </Text>
            </Surface>
          )}

          {/* Genre preferences */}
          <Text variant="titleMedium" style={[styles.sectionLabel, { color: theme.colors.onBackground }]}>
            Genre preferences
          </Text>
          {genres.length > 0 ? (
            <View style={styles.chipWrap}>
              {genres.map((genre) => (
                <Chip key={genre.genre_id} icon="music" style={styles.chip} onPress={() => router.push("/preferences")}>
                  {genre.genre_name}
                </Chip>
              ))}
            </View>
          ) : (
            <Surface style={[styles.emptyCard, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {user ? "Not set yet — tap edit to choose your favorites." : "—"}
              </Text>
            </Surface>
          )}

          {user && (
            <Button mode="outlined" icon="logout" onPress={logout} style={styles.logoutBtn}>
              Log out
            </Button>
          )}
        </ScrollView>
      )}
    </AppScaffold>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  identity: { alignItems: "center", paddingVertical: 16 },
  card: { borderRadius: 24, marginTop: 8 },
  progressHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: 10 },
  streakIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  progressBar: { height: 10, borderRadius: 8 },
  sectionLabel: { marginTop: 28, marginBottom: 12 },
  masteryWrap: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 16 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {},
  emptyCard: { borderRadius: 16, padding: 16 },
  logoutBtn: { marginTop: 32 },
});
