import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text } from "react-native";
import { QuestionCard } from "../../../components/QuestionCards";
import { getLessonQuestions } from "../../../data/lessonQuestions";

export default function TopicPracticeScreen() {
  const router = useRouter();
  const { levelId, topic, label } = useLocalSearchParams<{ levelId: string; topic: string; label: string }>();

  const questions = getLessonQuestions(levelId);

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>← back</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{label ?? topic}</Text>
        <Text style={styles.subtitle}>{topic}</Text>

        {questions && questions.length > 0 ? (
          questions.map((q, i) => <QuestionCard key={i} question={q} />)
        ) : (
          <Text style={styles.errorText}>No practice questions available for this topic yet.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FDF6EC" },
  backBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#E8C5A0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 16,
  },
  backBtnText: { fontFamily: "Courier New", fontSize: 14, color: "#5C3D2E" },
  container: { padding: 24, paddingBottom: 48 },
  title: { fontFamily: "Courier New", fontSize: 22, fontWeight: "bold", color: "#5C3D2E" },
  subtitle: { fontFamily: "Courier New", fontSize: 14, color: "#8B6347", marginBottom: 20 },
  errorText: { fontFamily: "Courier New", fontSize: 14, color: "#B94A48", textAlign: "center", marginTop: 20 },
});
