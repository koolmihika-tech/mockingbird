import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SONGS } from "../../data/songs";
import vocab from "../../data/vocabulary.json";
import { generateQuestions, Question } from "../../Supabase/services/questions";

type Mode = "reading" | "writing";

function MultipleChoiceCard({ question }: { question: Question }) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <View style={styles.card}>
      <Text style={styles.cardPrompt}>{question.prompt}</Text>
      <View style={styles.optionsList}>
        {(question.options ?? []).map((option) => {
          const isSelected = selected === option;
          const isCorrect = option === question.answer;
          const showResult = selected != null && (isSelected || isCorrect);
          return (
            <Pressable
              key={option}
              style={[
                styles.optionBtn,
                showResult && isCorrect && styles.optionCorrect,
                showResult && isSelected && !isCorrect && styles.optionIncorrect,
              ]}
              onPress={() => setSelected(option)}
              disabled={selected != null}
            >
              <Text style={styles.optionText}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ShortAnswerCard({ question }: { question: Question }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.card}>
      <Text style={styles.cardPrompt}>{question.prompt}</Text>
      <Text style={styles.targetWord}>Target word: {question.targetWord}</Text>
      {revealed ? (
        <Text style={styles.sampleAnswer}>{question.answer}</Text>
      ) : (
        <Pressable style={styles.revealBtn} onPress={() => setRevealed(true)}>
          <Text style={styles.revealBtnText}>Reveal sample answer</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function ReadingWritingPracticeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const song = SONGS.find((s) => s.id === id);

  const [mode, setMode] = useState<Mode>("reading");
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!song) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.notFound}>Song not found.</Text>
      </SafeAreaView>
    );
  }

  const words = Object.keys((vocab as Record<string, Record<string, string>>)[song.name] ?? {});

  async function handleGenerate(nextMode: Mode) {
    // console.log("[reading] button pressed, mode:", nextMode);
    setMode(nextMode);
    setQuestions(null);
    setError(null);
    setLoading(true);
    // console.log("[reading] song:", song!.name, "words:", words);
    try {
      // console.log("[reading] calling generateQuestions...");
      const result = await generateQuestions(song!.name, words, nextMode);
      // console.log("[reading] generateQuestions succeeded, questions:", result);
      setQuestions(result);
    } catch (e: any) {
      // console.error("[reading] generateQuestions threw:", e);
      setError(e.message ?? "Could not generate questions.");
    } finally {
      // console.log("[reading] done, loading=false");
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.songName}>{song.name}</Text>
        <Text style={styles.songArtist}>{song.artist}</Text>

        {words.length === 0 ? (
          <Text style={styles.errorText}>No vocabulary available for this song yet.</Text>
        ) : (
          <>
            <View style={styles.modeRow}>
              <Pressable
                style={[styles.modeBtn, mode === "reading" && styles.modeBtnActive]}
                onPress={() => handleGenerate("reading")}
              >
                <Text style={styles.modeBtnText}>Reading</Text>
              </Pressable>
              <Pressable
                style={[styles.modeBtn, mode === "writing" && styles.modeBtnActive]}
                onPress={() => handleGenerate("writing")}
              >
                <Text style={styles.modeBtnText}>Writing</Text>
              </Pressable>
            </View>

            {loading ? (
              <ActivityIndicator color="#5C3D2E" style={styles.spinner} />
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : questions ? (
              questions.map((q, i) =>
                q.type === "multiple_choice" ? (
                  <MultipleChoiceCard key={i} question={q} />
                ) : (
                  <ShortAnswerCard key={i} question={q} />
                )
              )
            ) : (
              <Text style={styles.hintText}>Pick Reading or Writing to generate practice questions.</Text>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FDF6EC" },
  topBar: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  backBtn: { alignSelf: "flex-start", backgroundColor: "#E8C5A0", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  backBtnText: { fontFamily: "Courier New", fontSize: 14, color: "#5C3D2E" },
  container: { padding: 24, paddingBottom: 48 },
  songName: { fontFamily: "Courier New", fontSize: 22, fontWeight: "bold", color: "#5C3D2E" },
  songArtist: { fontFamily: "Courier New", fontSize: 15, color: "#8B6347", marginBottom: 20 },

  modeRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  modeBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 20, backgroundColor: "#FFF3E0" },
  modeBtnActive: { backgroundColor: "#E8C5A0" },
  modeBtnText: { fontFamily: "Courier New", fontSize: 14, fontWeight: "600", color: "#5C3D2E" },

  spinner: { marginTop: 20 },
  hintText: { fontFamily: "Courier New", fontSize: 13, color: "#8B6347", textAlign: "center", marginTop: 20 },
  errorText: { fontFamily: "Courier New", fontSize: 14, color: "#B94A48", textAlign: "center", marginTop: 20 },

  card: { backgroundColor: "#FFF3E0", borderRadius: 12, padding: 16, marginBottom: 14 },
  cardPrompt: { fontFamily: "Courier New", fontSize: 15, color: "#5C3D2E", marginBottom: 12, lineHeight: 22 },

  optionsList: { gap: 8 },
  optionBtn: { borderWidth: 1, borderColor: "#E8D5C0", borderRadius: 10, padding: 10, backgroundColor: "#FDF6EC" },
  optionCorrect: { backgroundColor: "#C9DAB5", borderColor: "#5C3D2E" },
  optionIncorrect: { backgroundColor: "#E8B5B5", borderColor: "#5C3D2E" },
  optionText: { fontFamily: "Courier New", fontSize: 14, color: "#5C3D2E" },

  targetWord: { fontFamily: "Courier New", fontSize: 12, color: "#8B6347", marginBottom: 10 },
  revealBtn: { alignSelf: "flex-start", backgroundColor: "#E8C5A0", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  revealBtnText: { fontFamily: "Courier New", fontSize: 13, color: "#5C3D2E" },
  sampleAnswer: { fontFamily: "Courier New", fontSize: 14, color: "#5C3D2E", fontStyle: "italic" },

  notFound: { fontFamily: "Courier New", fontSize: 16, color: "#5C3D2E", padding: 24 },
});
