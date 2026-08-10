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

// Case/whitespace/accent-insensitive comparison — typing accents is
// inconvenient on most keyboards, so "esta noche" should match "está noche".
// Fill-in-the-blank answers must not depend on an accent to be correct (a
// distinct word an accent away, e.g. tu/tú, should be multiple_choice
// instead — see data/lessonQuestions.ts), so stripping accents here can't
// turn a wrong answer into a right one.
function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "");
}

// Fill-in-the-blank: user types an answer and it's checked against the
// expected answer (case/whitespace/accent-insensitive).
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
  const isCorrect = normalizeAnswer(value) === normalizeAnswer(question.answer);

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
// counted as correct for scoring purposes. onAnswered still fires on reveal
// (with correct=true) so callers can time how long the learner spent on it.
export function ShortAnswerCard({
  question,
  onAnswered,
}: {
  question: Question;
  onAnswered?: (correct: boolean) => void;
}) {
  const theme = useAppTheme();
  const [revealed, setRevealed] = useState(false);

  function handleReveal() {
    setRevealed(true);
    onAnswered?.(true);
  }

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
          <Button mode="contained-tonal" onPress={handleReveal} style={styles.actionBtn}>
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
  return <ShortAnswerCard question={question} onAnswered={onAnswered} />;
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
