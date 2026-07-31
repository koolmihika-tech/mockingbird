import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Card, Text, TextInput } from "react-native-paper";
import { useAppTheme } from "../constants/theme";
import { Question } from "../Supabase/services/questions";

export function MultipleChoiceCard({
  question,
  onAnswered,
}: {
  question: Question;
  onAnswered?: (correct: boolean) => void;
}) {
  const theme = useAppTheme();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Card mode="contained" style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}>
      <Card.Content>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 12 }}>
          {question.prompt}
        </Text>
        <View style={styles.optionsList}>
          {(question.options ?? []).map((option) => {
            const isSelected = selected === option;
            const isCorrect = option === question.answer;
            const showResult = selected != null && (isSelected || isCorrect);
            const bg = showResult && isCorrect
              ? theme.colors.successContainer
              : showResult && isSelected && !isCorrect
              ? theme.colors.errorContainer
              : theme.colors.surface;
            const fg = showResult && isCorrect
              ? theme.colors.onSuccessContainer
              : showResult && isSelected && !isCorrect
              ? theme.colors.onErrorContainer
              : theme.colors.onSurface;
            return (
              <Button
                key={option}
                mode="outlined"
                onPress={() => {
                  setSelected(option);
                  onAnswered?.(option === question.answer);
                }}
                disabled={selected != null}
                textColor={fg}
                style={[styles.optionBtn, { backgroundColor: bg }]}
                contentStyle={styles.optionContent}
                labelStyle={styles.optionLabel}
              >
                {option}
              </Button>
            );
          })}
        </View>
      </Card.Content>
    </Card>
  );
}

// Fill-in-the-blank: user types an answer and it's checked against the
// expected answer (case/whitespace-insensitive).
export function FillBlankCard({
  question,
  onAnswered,
}: {
  question: Question;
  onAnswered?: (correct: boolean) => void;
}) {
  const theme = useAppTheme();
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState(false);
  const isCorrect = value.trim().toLowerCase() === question.answer.trim().toLowerCase();

  function handleCheck() {
    setChecked(true);
    onAnswered?.(isCorrect);
  }

  return (
    <Card mode="contained" style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}>
      <Card.Content>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 12 }}>
          {question.prompt}
        </Text>
        <TextInput
          mode="outlined"
          value={value}
          onChangeText={setValue}
          editable={!checked}
          placeholder="Escribe tu respuesta"
          autoCapitalize="none"
          outlineColor={checked ? (isCorrect ? theme.colors.success : theme.colors.error) : undefined}
          activeOutlineColor={checked ? (isCorrect ? theme.colors.success : theme.colors.error) : undefined}
          style={styles.input}
        />
        {checked ? (
          <Text variant="bodyMedium" style={{ color: isCorrect ? theme.colors.success : theme.colors.onSurface, fontStyle: "italic" }}>
            {isCorrect ? "¡Correcto!" : `Correct answer: ${question.answer}`}
          </Text>
        ) : (
          <Button mode="contained" onPress={handleCheck} disabled={value.trim().length === 0} style={styles.actionBtn}>
            Check
          </Button>
        )}
      </Card.Content>
    </Card>
  );
}

// Free-production writing prompts aren't auto-gradable, so they're always
// counted as correct for scoring purposes.
export function ShortAnswerCard({ question }: { question: Question }) {
  const theme = useAppTheme();
  const [revealed, setRevealed] = useState(false);

  return (
    <Card mode="contained" style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}>
      <Card.Content>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>
          {question.prompt}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 10 }}>
          Target word: {question.targetWord}
        </Text>
        {revealed ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontStyle: "italic" }}>
            {question.answer}
          </Text>
        ) : (
          <Button mode="contained-tonal" onPress={() => setRevealed(true)} style={styles.actionBtn}>
            Reveal sample answer
          </Button>
        )}
      </Card.Content>
    </Card>
  );
}

export function QuestionCard({
  question,
  onAnswered,
}: {
  question: Question;
  onAnswered?: (correct: boolean) => void;
}) {
  if (question.type === "multiple_choice") {
    return <MultipleChoiceCard question={question} onAnswered={onAnswered} />;
  }
  if (question.type === "fill_blank") {
    return <FillBlankCard question={question} onAnswered={onAnswered} />;
  }
  return <ShortAnswerCard question={question} />;
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, marginBottom: 14 },
  optionsList: { gap: 8 },
  optionBtn: { borderRadius: 12 },
  optionContent: { justifyContent: "flex-start", paddingVertical: 4 },
  optionLabel: { textAlign: "left" },
  input: { marginBottom: 10 },
  actionBtn: { alignSelf: "flex-start" },
});
