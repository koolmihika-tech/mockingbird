import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { AppScaffold } from "../components/AppScaffold";
import { useAppTheme, type AppTheme } from "../constants/theme";
import { useSupabaseAuth } from "../context/SupabaseAuth";
import { getLessonId } from "../data/lessonQuestions";
import { fetchCompletedLessonIds } from "../Supabase/services/activityHistory";
import { fetchAllLevelTopics, fetchUserLevel, type Level, type LevelTopic } from "../Supabase/services/levels";

type PathBox = { key: string; label: string; topic?: LevelTopic };

export default function LessonsScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const { user } = useSupabaseAuth();
  const [levelTopics, setLevelTopics] = useState<LevelTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLevel, setUserLevel] = useState<Level | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAllLevelTopics()
      .then(setLevelTopics)
      .catch((e) => {
        console.error("Failed to load levels:", e);
        setError("Could not load lessons.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchUserLevel(user.id)
      .then(setUserLevel)
      .catch(() => setUserLevel(null));
  }, [user]);

  // Which goals are already done, from the lessons logged in
  // user_activity_history. Refetched on focus so a goal finished in a lesson
  // shows its green checkmark as soon as we come back here.
  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setCompletedLessons(new Set());
        return;
      }
      fetchCompletedLessonIds(user.id)
        .then(setCompletedLessons)
        .catch(() => setCompletedLessons(new Set()));
    }, [user])
  );

  const levels = useMemo(() => {
    const byLevel = new Map<string, LevelTopic[]>();
    for (const row of levelTopics) {
      if (!byLevel.has(row.level_name)) byLevel.set(row.level_name, []);
      byLevel.get(row.level_name)!.push(row);
    }
    return Array.from(byLevel.entries()).sort((a, b) => Number(a[0]) - Number(b[0]));
  }, [levelTopics]);

  function isGoalComplete(topic?: LevelTopic) {
    if (!topic) return false;
    const lessonId = getLessonId(topic.level_id);
    return !!lessonId && completedLessons.has(String(lessonId));
  }

  return (
    <AppScaffold title="Lessons" back>
      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={styles.spinner} />
      ) : error ? (
        <Text variant="bodyMedium" style={styles.errorText}>
          {error}
        </Text>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          {levels.map(([levelName, topics]) => {
            const boxes: PathBox[] = [
              ...topics.slice(0, 4).map((t) => ({ key: t.level_id, label: t.goal ?? t.topics, topic: t })),
              { key: `${levelName}-unit-test`, label: "Unit Test" },
            ];
            const isLocked = !!userLevel && Number(levelName) > Number(userLevel.level_name);
            // e.g. "Level 1 - Survival Spanish"
            const focusArea = topics.find((t) => t.focus_area)?.focus_area;
            const levelLabel = focusArea ? `Level ${levelName} - ${focusArea}` : `Level ${levelName}`;
            return (
              <View key={levelName} style={styles.levelSection}>
                <Text variant="titleMedium" style={[styles.levelHeading, isLocked && styles.lockedHeading]}>
                  {levelLabel}
                </Text>
                <View style={styles.path}>
                  {boxes.map((box, i) => {
                    const isUnitTest = !box.topic;
                    const complete = isGoalComplete(box.topic);
                    return (
                      <View key={box.key} style={styles.pathItem}>
                        <View style={styles.boxRow}>
                          <Pressable
                            style={[styles.box, isUnitTest && styles.unitTestBox, isLocked && styles.lockedBox]}
                            disabled={isUnitTest}
                            onPress={() =>
                              box.topic &&
                              router.push({
                                pathname: "/lessons/topic/[levelId]",
                                params: { levelId: box.topic.level_id, topic: box.topic.topics, label: box.label },
                              } as any)
                            }
                          >
                            <Text
                              variant="bodyMedium"
                              style={[styles.boxText, isUnitTest && styles.unitTestText, isLocked && styles.lockedBoxText]}
                            >
                              {box.label}
                            </Text>
                          </Pressable>
                          {/* Goal completion: grey until the lesson is logged, then green.
                              Positioned outside the row's flow (absolute) so it never shifts
                              the box itself off-center — box, arrow, and next box all line up. */}
                          <View style={styles.checkIconSlot}>
                            {!isUnitTest && (
                              <MaterialCommunityIcons
                                name={complete ? "check-circle" : "check-circle-outline"}
                                size={24}
                                color={complete ? theme.colors.success : theme.colors.outline}
                                accessibilityLabel={complete ? `${box.label} completed` : `${box.label} not completed`}
                              />
                            )}
                          </View>
                        </View>
                        {/* Arrows connect the goals only — the gap before Unit Test keeps the
                            same spacing but with no arrow, since it doesn't lead into another goal. */}
                        {i < boxes.length - 1 && (
                          <View style={styles.arrowSlot}>
                            {i < boxes.length - 2 && (
                              <MaterialCommunityIcons name="chevron-down" size={22} color={theme.colors.onSurfaceVariant} />
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </AppScaffold>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    spinner: { marginTop: 40 },
    errorText: { color: theme.colors.error, textAlign: "center", marginTop: 40 },
    container: { padding: 24, paddingBottom: 48 },
    levelSection: { marginBottom: 32 },
    levelHeading: { color: theme.colors.onBackground, fontWeight: "800", marginBottom: 16 },
    lockedHeading: { color: theme.colors.onSurfaceVariant, opacity: 0.6 },
    path: { alignItems: "center" },
    pathItem: { alignItems: "center" },
    // Position: relative so checkIconSlot can float outside the box without
    // widening boxRow — that keeps boxRow's width equal to the box's own
    // width, so it (and the arrow below it) center correctly on the box.
    boxRow: { position: "relative" },
    checkIconSlot: {
      position: "absolute",
      left: "100%",
      top: 0,
      bottom: 0,
      marginLeft: 10,
      width: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    arrowSlot: { height: 22, width: 22, alignItems: "center", justifyContent: "center" },
    box: {
      backgroundColor: theme.colors.surfaceVariant,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 18,
      minWidth: 220,
      alignItems: "center",
    },
    boxText: { color: theme.colors.onSurface, textAlign: "center" },
    unitTestBox: { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary, borderRadius: 24 },
    unitTestText: { color: theme.colors.onPrimaryContainer, fontWeight: "700" },
    lockedBox: { backgroundColor: theme.colors.surfaceDisabled, borderColor: theme.colors.outlineVariant },
    lockedBoxText: { color: theme.colors.onSurfaceVariant, opacity: 0.6 },
  });
