import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from "react-native-svg";
import { AppScaffold } from "../components/AppScaffold";
import { useAppTheme, type AppTheme } from "../constants/theme";
import { useSupabaseAuth } from "../context/SupabaseAuth";
import { getLessonId } from "../data/lessonQuestions";
import { fetchCompletedLessonIds } from "../Supabase/services/activityHistory";
import { fetchAllLevelTopics, fetchUserLevel, type Level, type LevelTopic } from "../Supabase/services/levels";

type LevelEntry = { levelName: string; topics: LevelTopic[] };
type LevelStatus = "completed" | "in_progress" | "not_started";

// An icon per level, so each card in the carousel reads at a glance. Levels
// beyond the list fall back to a generic badge.
const LEVEL_ICONS = ["sprout", "leaf", "flower-tulip", "tree", "trophy", "crown"] as const;
const DEFAULT_LEVEL_ICON = "medal-outline";

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
];
const DEFAULT_TOPIC_ICON = "book-open-page-variant-outline";

function levelIconFor(levelName: string): keyof typeof MaterialCommunityIcons.glyphMap {
  const n = Number(levelName);
  return (LEVEL_ICONS[n - 1] ?? DEFAULT_LEVEL_ICON) as keyof typeof MaterialCommunityIcons.glyphMap;
}

function topicIconFor(label: string): keyof typeof MaterialCommunityIcons.glyphMap {
  return TOPIC_ICONS.find((t) => t.match.test(label))?.icon ?? DEFAULT_TOPIC_ICON;
}

const STATUS_LABEL: Record<LevelStatus, string> = {
  completed: "Completed",
  in_progress: "In Progress",
  not_started: "Not Started",
};

export default function LessonsScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { width } = useWindowDimensions();

  // Carousel geometry: current card 60% of the screen, with the previous/next
  // cards peeking ~15% on either side (5% gap between cards makes up the rest).
  const CARD_WIDTH = Math.round(width * 0.6);
  const CARD_HEIGHT = 156;
  const SPACING = Math.round(width * 0.05);
  const SIDE_PAD = Math.round((width - CARD_WIDTH - SPACING) / 2);
  const SNAP = CARD_WIDTH + SPACING;

  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { user } = useSupabaseAuth();
  const [levelTopics, setLevelTopics] = useState<LevelTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLevel, setUserLevel] = useState<Level | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const didInitIndex = useRef(false);
  const listRef = useRef<FlatList<LevelEntry>>(null);

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
  // shows its completed state as soon as we come back here.
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

  const levels = useMemo<LevelEntry[]>(() => {
    const byLevel = new Map<string, LevelTopic[]>();
    for (const row of levelTopics) {
      if (!byLevel.has(row.level_name)) byLevel.set(row.level_name, []);
      byLevel.get(row.level_name)!.push(row);
    }
    return Array.from(byLevel.entries())
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([levelName, topics]) => ({ levelName, topics }));
  }, [levelTopics]);

  const isGoalComplete = useCallback(
    (topic?: LevelTopic) => {
      if (!topic) return false;
      const lessonId = getLessonId(topic.level_id);
      return !!lessonId && completedLessons.has(String(lessonId));
    },
    [completedLessons]
  );

  const goalsOf = useCallback((topics: LevelTopic[]) => topics.slice(0, 4), []);

  const statusOf = useCallback(
    (topics: LevelTopic[]): LevelStatus => {
      const goals = goalsOf(topics);
      if (goals.length === 0) return "not_started";
      const done = goals.filter(isGoalComplete).length;
      if (done === 0) return "not_started";
      if (done >= goals.length) return "completed";
      return "in_progress";
    },
    [goalsOf, isGoalComplete]
  );

  const isLevelLocked = useCallback(
    (levelName: string) => !!userLevel && Number(levelName) > Number(userLevel.level_name),
    [userLevel]
  );

  // Open the carousel on the user's current level once both the levels and the
  // user's level have loaded (only the first time).
  useEffect(() => {
    if (didInitIndex.current || levels.length === 0 || !userLevel) return;
    const idx = levels.findIndex((l) => l.levelName === userLevel.level_name);
    if (idx > 0) {
      didInitIndex.current = true;
      setActiveIndex(idx);
      // Let the list mount/layout first, then bring the current level into view.
      requestAnimationFrame(() => listRef.current?.scrollToIndex({ index: idx, animated: false }));
    } else if (idx === 0) {
      didInitIndex.current = true;
    }
  }, [levels, userLevel]);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / SNAP);
      setActiveIndex(Math.max(0, Math.min(idx, levels.length - 1)));
    },
    [SNAP, levels.length]
  );

  const goToIndex = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(idx, levels.length - 1));
      setActiveIndex(clamped);
      listRef.current?.scrollToIndex({ index: clamped, animated: true });
    },
    [levels.length]
  );

  const renderCard = useCallback(
    ({ item, index }: { item: LevelEntry; index: number }) => {
      const status = statusOf(item.topics);
      const locked = isLevelLocked(item.levelName);
      const focusArea = item.topics.find((t) => t.focus_area)?.focus_area ?? null;
      const active = index === activeIndex;

      // Status drives the card's gradient so the carousel reads at a glance.
      const [g1, g2] = locked
        ? [theme.colors.surfaceVariant, theme.colors.surfaceDisabled]
        : status === "completed"
          ? [theme.colors.success, theme.colors.secondary]
          : status === "in_progress"
            ? [theme.colors.primary, theme.colors.accentIndigo]
            : [theme.colors.surfaceVariant, theme.colors.primaryContainer];
      const onCard = locked || status === "not_started" ? theme.colors.onSurfaceVariant : "#FFFFFF";
      const gradId = `lvl-grad-${item.levelName}`;

      return (
        <Pressable
          onPress={() => goToIndex(index)}
          style={[
            styles.card,
            { width: CARD_WIDTH, marginHorizontal: SPACING / 2, opacity: locked ? 0.65 : 1 },
            active && styles.cardActive,
          ]}
        >
          <Svg width={CARD_WIDTH} height={CARD_HEIGHT} style={StyleSheet.absoluteFill}>
            <Defs>
              <SvgLinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={g1} />
                <Stop offset="1" stopColor={g2} />
              </SvgLinearGradient>
            </Defs>
            <Rect x="0" y="0" width={CARD_WIDTH} height={CARD_HEIGHT} rx={24} fill={`url(#${gradId})`} />
          </Svg>

          <View style={styles.cardBody}>
            <View style={styles.cardTextCol}>
              {focusArea && (
                <Text variant="bodySmall" style={[styles.cardFocus, { color: onCard }]} numberOfLines={1}>
                  Level {item.levelName}
                </Text>
              )}
              <Text variant="headlineSmall" style={[styles.cardTitle, { color: onCard }]} numberOfLines={2}>
                {focusArea ?? `Level ${item.levelName}`}
              </Text>
              <Text variant="titleSmall" style={[styles.cardStatus, { color: onCard }]}>
                {locked ? "Locked" : STATUS_LABEL[status]}
              </Text>
            </View>
            <MaterialCommunityIcons
              name={locked ? "lock" : levelIconFor(item.levelName)}
              size={40}
              color={onCard}
              style={styles.cardIcon}
            />
          </View>
        </Pressable>
      );
    },
    [
      activeIndex,
      CARD_WIDTH,
      CARD_HEIGHT,
      SPACING,
      goToIndex,
      isLevelLocked,
      statusOf,
      styles,
      theme,
    ]
  );

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
          {/* Level carousel */}
          <View style={styles.carouselWrap}>
            <FlatList
              ref={listRef}
              data={levels}
              keyExtractor={(l) => l.levelName}
              renderItem={renderCard}
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={SNAP}
              snapToAlignment="start"
              disableIntervalMomentum
              contentContainerStyle={{ paddingHorizontal: SIDE_PAD }}
              onMomentumScrollEnd={onMomentumEnd}
              getItemLayout={(_, index) => ({ length: SNAP, offset: SNAP * index, index })}
              initialScrollIndex={activeIndex}
              onScrollToIndexFailed={({ index }) => {
                setTimeout(() => listRef.current?.scrollToIndex({ index, animated: false }), 0);
              }}
            />
          </View>

          {/* Page indicator dots */}
          <View style={styles.dots}>
            {levels.map((l, i) => (
              <Pressable key={l.levelName} onPress={() => goToIndex(i)} hitSlop={8}>
                <View style={[styles.dot, i === activeIndex && styles.dotActive]} />
              </Pressable>
            ))}
          </View>

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

              {/* Unit test — large oval button. Not yet implemented, so it's a
                  non-interactive placeholder like Listening/Speaking. */}
              <View style={[styles.unitTest, styles.unitTestLocked]}>
                <MaterialCommunityIcons name="clipboard-check-outline" size={22} color={theme.colors.onSurfaceVariant} />
                <Text variant="titleMedium" style={styles.unitTestTextLocked}>
                  Unit Test
                </Text>
                <Text variant="labelMedium" style={styles.unitTestComingSoon}>
                  Coming soon
                </Text>
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

    // Carousel
    carouselWrap: { height: 156 },
    card: {
      height: 156,
      borderRadius: 24,
      overflow: "hidden",
      justifyContent: "center",
    },
    cardActive: {
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    cardBody: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
    },
    cardTextCol: { flex: 1, paddingRight: 8 },
    cardTitle: { fontWeight: "800" },
    cardFocus: { opacity: 0.9, marginTop: 2 },
    cardStatus: { fontWeight: "700", marginTop: 10, opacity: 0.95 },
    cardIcon: { opacity: 0.95 },

    // Dots
    dots: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 16, gap: 8 },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.outlineVariant },
    dotActive: { backgroundColor: theme.colors.primary, width: 20 },

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

    // Unit test oval
    unitTest: {
      marginTop: 32,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: theme.colors.primary,
      borderRadius: 999,
      paddingVertical: 18,
      paddingHorizontal: 24,
    },
    unitTestLocked: { backgroundColor: theme.colors.surfaceDisabled, opacity: 0.6 },
    unitTestText: { color: theme.colors.onPrimary, fontWeight: "800" },
    unitTestTextLocked: { color: theme.colors.onSurfaceVariant, fontWeight: "800" },
    unitTestComingSoon: { color: theme.colors.onSurfaceVariant, opacity: 0.9 },
  });
