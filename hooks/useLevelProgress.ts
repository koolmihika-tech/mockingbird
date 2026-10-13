import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSupabaseAuth } from "../context/SupabaseAuth";
import { getLessonId } from "../data/lessonQuestions";
import { fetchCompletedLessonIds } from "../Supabase/services/activityHistory";
import { fetchAllLevelTopics, fetchUserLevel, type Level, type LevelTopic } from "../Supabase/services/levels";

export type LevelEntry = { levelName: string; topics: LevelTopic[] };
export type LevelStatus = "completed" | "in_progress" | "not_started";

/** The lesson levels (from the Supabase levels table) with the signed-in
 *  user's progress through them — shared by the Lessons page and the level
 *  carousel on the Practice tab. */
export function useLevelProgress() {
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
  // shows its completed state as soon as we come back.
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

  // A level's subtopics in path order (data/lessonQuestions.ts lessonId), so
  // each level's Irregulars topic comes last. Rows without static questions
  // sort to the end.
  const goalsOf = useCallback(
    (topics: LevelTopic[]) =>
      [...topics].sort(
        (a, b) => Number(getLessonId(a.level_id) ?? Infinity) - Number(getLessonId(b.level_id) ?? Infinity)
      ),
    []
  );

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

  return { levels, loading, error, userLevel, isGoalComplete, goalsOf, statusOf, isLevelLocked };
}
