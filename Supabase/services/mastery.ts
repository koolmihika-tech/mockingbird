import { supabase } from "../lib/supabase";
import { fetchAllLevelTopics, type LevelTopic } from "./levels";

export interface TopicMastery {
  focusArea: string;
  accuracy: number | null; // 0-100 average of lesson_history.total_accuracy, or null if never attempted
  attempts: number;
}

export interface SubtopicMastery {
  levelId: string;
  topic: string; // levels.topics
  accuracy: number | null;
  attempts: number;
}

export interface TopicMasteryDetail {
  focusArea: string;
  overall: TopicMastery;
  subtopics: SubtopicMastery[];
}

type AccuracySum = { total: number; count: number };

// lesson_history.total_accuracy summed per lesson_id (== levels.level_id), for one user.
async function fetchAccuracyByLevelId(userId: string): Promise<Map<string, AccuracySum>> {
  const { data: history, error } = await supabase
    .from("lesson_history")
    .select("lesson_id, total_accuracy")
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to fetch lesson history for mastery:", error.message);
  }

  const sums = new Map<string, AccuracySum>();
  for (const row of history ?? []) {
    if (row.total_accuracy == null) continue;
    const entry = sums.get(row.lesson_id) ?? { total: 0, count: 0 };
    entry.total += row.total_accuracy;
    entry.count += 1;
    sums.set(row.lesson_id, entry);
  }
  return sums;
}

// Unique levels.focus_area values, in level progression order.
function orderedFocusAreas(levelTopics: LevelTopic[]): string[] {
  const areas: string[] = [];
  for (const t of [...levelTopics].sort((a, b) => Number(a.level_name) - Number(b.level_name))) {
    if (t.focus_area && !areas.includes(t.focus_area)) areas.push(t.focus_area);
  }
  return areas;
}

// One entry per levels.focus_area, in level progression order — including
// topics the user hasn't attempted yet (accuracy: null) — so the profile
// page can show a mastery dial for every topic.
export async function fetchTopicMastery(userId: string): Promise<TopicMastery[]> {
  const [sumsByLevelId, levelTopics] = await Promise.all([fetchAccuracyByLevelId(userId), fetchAllLevelTopics()]);

  const sumsByFocusArea = new Map<string, AccuracySum>();
  for (const t of levelTopics) {
    const levelSum = sumsByLevelId.get(t.level_id);
    if (!t.focus_area || !levelSum) continue;
    const entry = sumsByFocusArea.get(t.focus_area) ?? { total: 0, count: 0 };
    entry.total += levelSum.total;
    entry.count += levelSum.count;
    sumsByFocusArea.set(t.focus_area, entry);
  }

  return orderedFocusAreas(levelTopics).map((focusArea) => {
    const entry = sumsByFocusArea.get(focusArea);
    return {
      focusArea,
      accuracy: entry ? Math.round(entry.total / entry.count) : null,
      attempts: entry?.count ?? 0,
    };
  });
}

// Drill-down for the "View details" page: the cumulative accuracy across a
// whole focus area, plus one entry per subtopic (levels.topics row) within it.
export async function fetchTopicMasteryDetail(userId: string, focusArea: string): Promise<TopicMasteryDetail> {
  const [sumsByLevelId, levelTopics] = await Promise.all([fetchAccuracyByLevelId(userId), fetchAllLevelTopics()]);

  const areaTopics = levelTopics.filter((t) => t.focus_area === focusArea);

  let overallTotal = 0;
  let overallCount = 0;
  const subtopics: SubtopicMastery[] = areaTopics.map((t) => {
    const entry = sumsByLevelId.get(t.level_id);
    if (entry) {
      overallTotal += entry.total;
      overallCount += entry.count;
    }
    return {
      levelId: t.level_id,
      topic: t.topics,
      accuracy: entry ? Math.round(entry.total / entry.count) : null,
      attempts: entry?.count ?? 0,
    };
  });

  return {
    focusArea,
    overall: {
      focusArea,
      accuracy: overallCount > 0 ? Math.round(overallTotal / overallCount) : null,
      attempts: overallCount,
    },
    subtopics,
  };
}
