import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text } from "react-native";
import { QuestionCard } from "../../../components/QuestionCards";
import { generateTopicQuestions, Question } from "../../../Supabase/services/questions";

export default function TopicPracticeScreen() {
  const router = useRouter();
  const { topic, label } = useLocalSearchParams<{ levelId: string; topic: string; label: string }>();

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!topic) return;
    setLoading(true);
    setError(null);
    generateTopicQuestions(topic)
      .then(setQuestions)
      .catch((e: any) => setError(e.message ?? "Could not generate questions."))
      .finally(() => setLoading(false));
  }, [topic]);

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>← back</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{label ?? topic}</Text>
        <Text style={styles.subtitle}>{topic}</Text>

        {loading ? (
          <ActivityIndicator color="#5C3D2E" style={styles.spinner} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : questions ? (
          questions.map((q, i) => <QuestionCard key={i} question={q} />)
        ) : null}
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
  spinner: { marginTop: 20 },
  errorText: { fontFamily: "Courier New", fontSize: 14, color: "#B94A48", textAlign: "center", marginTop: 20 },
});
