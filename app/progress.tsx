import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, ProgressBar, Text } from "react-native-paper";
import { AppScaffold } from "../components/AppScaffold";
import { useAppTheme, withAlpha } from "../constants/theme";
import { useSupabaseAuth } from "../context/SupabaseAuth";
import { getLoginStreak } from "../Supabase/services/streak";

export default function ProgressScreen() {
  const theme = useAppTheme();
  const { user } = useSupabaseAuth();
  const [streak, setStreak] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    getLoginStreak(user.id)
      .then(setStreak)
      .finally(() => setLoading(false));
  }, [user]);

  const displayName = user?.user_metadata?.display_name ?? "—";
  const streakGoal = 7;
  const streakProgress = Math.min((streak ?? 0) / streakGoal, 1);

  return (
    <AppScaffold title="Progress" back>
      <View style={styles.content}>
        <Text variant="titleLarge" style={{ color: theme.colors.onBackground, marginBottom: 20 }}>
          Welcome, {displayName}!
        </Text>

        <Card mode="contained" style={[styles.card, { backgroundColor: theme.colors.primaryContainer }]}>
          <Card.Content>
            <View style={styles.streakRow}>
              <View style={[styles.streakIcon, { backgroundColor: withAlpha(theme.colors.streak, 0.22) }]}>
                <MaterialCommunityIcons name="fire" size={24} color={theme.colors.streak} />
              </View>
              {loading ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : (
                <Text variant="headlineSmall" style={{ color: theme.colors.onPrimaryContainer }}>
                  {streak ?? 0} day streak
                </Text>
              )}
            </View>
            <ProgressBar
              progress={streakProgress}
              color={theme.colors.streak}
              style={[styles.progressBar, { backgroundColor: withAlpha(theme.colors.onPrimaryContainer, 0.15) }]}
            />
            <Text variant="labelMedium" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.85, marginTop: 8 }}>
              {streak ?? 0}/{streakGoal} days this week
            </Text>
          </Card.Content>
        </Card>
      </View>
    </AppScaffold>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8 },
  card: { borderRadius: 24 },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  streakIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  progressBar: { height: 10, borderRadius: 8 },
});
