import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { AppScaffold } from "../../../components/AppScaffold";
import { QuestionCard } from "../../../components/QuestionCards";
import { useAppTheme } from "../../../constants/theme";
import { useSupabaseAuth } from "../../../context/SupabaseAuth";
import { getLessonId, getLessonQuestions } from "../../../data/lessonQuestions";
import { logActivity } from "../../../Supabase/services/activityHistory";

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

  function handleAnswered(index: number, correct: boolean) {
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
