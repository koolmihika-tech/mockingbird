import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { AppScaffold } from "../components/AppScaffold";
import { LevelCarousel } from "../components/LevelCarousel";
import { useAppTheme, type AppTheme } from "../constants/theme";
import { useLevelProgress } from "../hooks/useLevelProgress";

// Keyword → icon for the topic circles. The topic's `goal` (e.g. "Greetings")
// is matched case-insensitively against these; first hit wins, else a default.
const TOPIC_ICONS: { match: RegExp; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { match: /introduc/i, icon: "account-voice" },
  { match: /greet/i, icon: "hand-wave" },
  { match: /courtesy|polite|thank/i, icon: "hand-heart" },
  { match: /number|numeric/i, icon: "numeric" },
  { match: /name|age/i, icon: "card-account-details-outline" },
  { match: /nationality|country/i, icon: "flag-outline" },
  { match: /profession|job|work/i, icon: "briefcase-outline" },
  { match: /date|day|month/i, icon: "calendar-month-outline" },
  { match: /colou?r/i, icon: "palette-outline" },
  { match: /household|home/i, icon: "home-outline" },
  { match: /classroom|school/i, icon: "school-outline" },
  { match: /descri/i, icon: "text-box-outline" },
  { match: /family|member/i, icon: "account-group-outline" },
  { match: /relationship/i, icon: "heart-outline" },
  { match: /possess|having|owning/i, icon: "gift-outline" },
  { match: /irregular/i, icon: "lightning-bolt-outline" },
];
const DEFAULT_TOPIC_ICON = "book-open-page-variant-outline";

function topicIconFor(label: string): keyof typeof MaterialCommunityIcons.glyphMap {
  return TOPIC_ICONS.find((t) => t.match.test(label))?.icon ?? DEFAULT_TOPIC_ICON;
}

export default function LessonsScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { levels, loading, error, userLevel, isGoalComplete, goalsOf, statusOf, isLevelLocked } = useLevelProgress();
  const [activeIndex, setActiveIndex] = useState(0);

  const active = levels[activeIndex];
  const activeLocked = active ? isLevelLocked(active.levelName) : false;
  const activeGoals = active ? goalsOf(active.topics) : [];

  return (
    <AppScaffold title="Lessons" back>
      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={styles.spinner} />
      ) : error ? (
        <Text variant="bodyMedium" style={styles.errorText}>
          {error}
        </Text>
      ) : levels.length === 0 ? (
        <Text variant="bodyMedium" style={styles.errorText}>
          No lessons available yet.
        </Text>
      ) : (
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
          <LevelCarousel
            levels={levels}
            statusOf={statusOf}
            isLevelLocked={isLevelLocked}
            initialLevelName={userLevel?.level_name}
            onActiveChange={setActiveIndex}
          />

          {/* Parts of the current level, as circles */}
          {active && (
            <View style={styles.panel}>
              <View style={styles.circleGrid}>
                {activeGoals.map((topic) => {
                  const label = topic.goal ?? topic.topics;
                  const complete = isGoalComplete(topic);
                  return (
                    <Pressable
                      key={topic.level_id}
                      style={styles.circleItem}
                      disabled={activeLocked}
                      onPress={() =>
                        router.push({
                          pathname: "/lessons/topic/[levelId]",
                          params: { levelId: topic.level_id, topic: topic.topics, label },
                        } as any)
                      }
                    >
                      <View
                        style={[
                          styles.circle,
                          complete && styles.circleComplete,
                          activeLocked && styles.circleLocked,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={activeLocked ? "lock" : topicIconFor(label)}
                          size={30}
                          color={
                            activeLocked
                              ? theme.colors.onSurfaceVariant
                              : complete
                                ? theme.colors.onPrimary
                                : theme.colors.primary
                          }
                        />
                        {complete && !activeLocked && (
                          <View style={styles.circleBadge}>
                            <MaterialCommunityIcons name="check-bold" size={12} color={theme.colors.onSuccess} />
                          </View>
                        )}
                      </View>
                      <Text variant="labelMedium" style={styles.circleLabel} numberOfLines={2}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </AppScaffold>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    spinner: { marginTop: 40 },
    errorText: { color: theme.colors.error, textAlign: "center", marginTop: 40 },
    page: { paddingTop: 20, paddingBottom: 48 },

    // Parts panel
    panel: {
      marginTop: 24,
      marginHorizontal: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 28,
      paddingVertical: 28,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
    },
    circleGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-around",
      rowGap: 32,
    },
    circleItem: { width: "45%", alignItems: "center" },
    circle: {
      width: 84,
      height: 84,
      borderRadius: 42,
      borderWidth: 1.5,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: "center",
      justifyContent: "center",
    },
    circleComplete: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    circleLocked: { backgroundColor: theme.colors.surfaceDisabled, borderColor: theme.colors.outlineVariant },
    circleBadge: {
      position: "absolute",
      top: -2,
      right: -2,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.success,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: theme.colors.surface,
    },
    circleLabel: { color: theme.colors.onSurface, textAlign: "center", marginTop: 10 },
  });
