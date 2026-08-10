import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { AppScaffold } from "../../../components/AppScaffold";
import { QuestionCard } from "../../../components/QuestionCards";
import { useAppTheme } from "../../../constants/theme";
import { useSupabaseAuth } from "../../../context/SupabaseAuth";
import { getLessonId, getLessonQuestions } from "../../../data/lessonQuestions";
import { logActivity } from "../../../Supabase/services/activityHistory";
import { logLessonHistory } from "../../../Supabase/services/lessonHistory";

export default function TopicPracticeScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { user } = useSupabaseAuth();
  const { levelId, topic, label } = useLocalSearchParams<{ levelId: string; topic: string; label: string }>();

  const questions = getLessonQuestions(levelId);
  const lessonId = getLessonId(levelId);

  // Writing-prompt (short_answer) questions can't be auto-graded, so they
  // start counted as correct; multiple_choice/fill_blank start unanswered.
  const [answers, setAnswers] = useState<(boolean | null)[]>(
    () => questions?.map((q) => (q.type === "short_answer" ? true : null)) ?? []
  );

  // Attributes the time between consecutive answer events to whichever
  // question was just answered, bucketed by its grammar/vocab category —
  // an approximation since questions can be answered in any order and idle
  // time before the very first or after the very last answer isn't counted.
  const lastEventTimeRef = useRef(Date.now());
  const grammarTimeMsRef = useRef(0);
  const vocabTimeMsRef = useRef(0);

  function handleAnswered(index: number, correct: boolean) {
    const now = Date.now();
    const delta = now - lastEventTimeRef.current;
    lastEventTimeRef.current = now;

    const category = questions?.[index]?.category;
    if (category === "grammar") grammarTimeMsRef.current += delta;
    else if (category === "vocab") vocabTimeMsRef.current += delta;

    setAnswers((prev) => {
      const next = [...prev];
      next[index] = correct;
      return next;
    });
  }

  async function handleExit() {
    if (user && lessonId && questions && questions.length > 0) {
      const correctCount = answers.filter((a) => a === true).length;
      const score = Math.round((correctCount / questions.length) * 100);
      await logActivity(user.id, "lesson", lessonId, score);

      const accuracyOf = (category: "grammar" | "vocab") => {
        const indices = questions.reduce<number[]>((acc, q, i) => {
          if (q.category === category) acc.push(i);
          return acc;
        }, []);
        if (indices.length === 0) return 0;
        const correct = indices.filter((i) => answers[i] === true).length;
        return Math.round((correct / indices.length) * 100);
      };

      await logLessonHistory(user.id, levelId, {
        grammarTimeSec: Math.round(grammarTimeMsRef.current / 1000),
        vocabTimeSec: Math.round(vocabTimeMsRef.current / 1000),
        grammarAccuracy: accuracyOf("grammar"),
        vocabAccuracy: accuracyOf("vocab"),
        totalAccuracy: score,
      });
    }
    router.back();
  }

  return (
    <AppScaffold title={label ?? topic} back onBack={handleExit}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 20 }}>
          {topic}
        </Text>

        {questions && questions.length > 0 ? (
          questions.map((q, i) => (
            <QuestionCard key={i} question={q} onAnswered={(correct) => handleAnswered(i, correct)} />
          ))
        ) : (
          <Text variant="bodyMedium" style={{ color: theme.colors.error, textAlign: "center", marginTop: 20 }}>
            No practice questions available for this topic yet.
          </Text>
        )}
      </ScrollView>
    </AppScaffold>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48 },
});
