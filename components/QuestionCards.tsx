import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Question } from "../Supabase/services/questions";

export function MultipleChoiceCard({ question }: { question: Question }) {
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

export function ShortAnswerCard({ question }: { question: Question }) {
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

export function QuestionCard({ question }: { question: Question }) {
  return question.type === "multiple_choice" ? (
    <MultipleChoiceCard question={question} />
  ) : (
    <ShortAnswerCard question={question} />
  );
}

const styles = StyleSheet.create({
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
});
