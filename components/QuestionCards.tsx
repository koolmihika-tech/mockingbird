import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Card, Text, TextInput } from "react-native-paper";
import { useAppTheme } from "../constants/theme";
import { Question } from "../Supabase/services/questions";
import { gradeWriting, type WritingGrade, type WritingLevel } from "../Supabase/services/writingGrade";

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

// Free-production writing prompts: the learner types their own sentence and
// it's graded by gradeWriting (rule checks, then Gemini) at three levels.
// For the boolean onAnswered score, "correct" and "minor" both count as
// right — minor slips (punctuation, capitalization) shouldn't hurt mastery,
// and missing accents never count against the learner at all.
export function ShortAnswerCard({
  question,
  onAnswered,
}: {
  question: Question;
  onAnswered?: (correct: boolean) => void;
}) {
  const theme = useAppTheme();
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [grading, setGrading] = useState(false);
  const [grade, setGrade] = useState<WritingGrade | null>(null);
  const [gradeError, setGradeError] = useState<string | null>(null);

  async function runGrade() {
    setGrading(true);
    setGradeError(null);
    try {
      const result = await gradeWriting(question, value.trim());
      setGrade(result);
      onAnswered?.(result.level !== "incorrect");
    } catch (e: any) {
      setGradeError(e?.message ?? "Could not check your sentence.");
    } finally {
      setGrading(false);
    }
  }

  function handleSubmit() {
    setSubmitted(true);
    void runGrade();
  }

  // Grading service unavailable: let the learner move on without a penalty.
  function skipCheck() {
    setGradeError(null);
    setGrade(null);
    onAnswered?.(true);
  }

  const verdict = grade ? VERDICTS[grade.level] : null;
  const verdictBg =
    grade?.level === "correct"
      ? theme.colors.successContainer
      : grade?.level === "minor"
      ? theme.colors.streakContainer
      : theme.colors.errorContainer;
  const verdictFg =
    grade?.level === "correct"
      ? theme.colors.onSuccessContainer
      : grade?.level === "minor"
      ? theme.colors.onStreakContainer
      : theme.colors.onErrorContainer;

  return (
    <Card mode="contained" style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}>
      <Card.Content>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>
          {question.prompt}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 10 }}>
          Target word: {question.targetWord}
        </Text>
        <TextInput
          mode="outlined"
          value={value}
          onChangeText={setValue}
          editable={!submitted}
          placeholder="Write your sentence in Spanish"
          multiline
          autoCapitalize="sentences"
          outlineColor={grade ? verdictFg : undefined}
          style={[styles.input, styles.sentenceInput]}
        />

        {!submitted ? (
          <Button mode="contained" onPress={handleSubmit} disabled={value.trim().length === 0} style={styles.actionBtn}>
            Submit
          </Button>
        ) : grading ? (
          <View style={styles.gradingRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Checking your sentence…
            </Text>
          </View>
        ) : gradeError ? (
          <View style={styles.feedbackBlock}>
            <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
              Couldn&apos;t check your sentence right now.
            </Text>
            <View style={styles.retryRow}>
              <Button mode="contained-tonal" onPress={() => void runGrade()}>
                Try again
              </Button>
              <Button mode="text" onPress={skipCheck}>
                Skip check
              </Button>
            </View>
          </View>
        ) : (
          <View style={styles.feedbackBlock}>
            {grade && verdict && (
              <>
                <View style={[styles.verdictBadge, { backgroundColor: verdictBg }]}>
                  <MaterialCommunityIcons name={verdict.icon} size={18} color={verdictFg} />
                  <Text variant="labelLarge" style={{ color: verdictFg, fontWeight: "700" }}>
                    {verdict.label}
                  </Text>
                </View>
                {!!grade.explanation && (
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                    {grade.explanation}
                  </Text>
                )}
                {grade.errors.length > 0 && (
                  <View style={styles.errorList}>
                    {grade.errors.map((err, i) => (
                      <View key={i} style={styles.errorItem}>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                          <Text style={[styles.errorWrong, { color: theme.colors.error }]}>{err.text}</Text>
                          {"  →  "}
                          <Text style={[styles.errorFix, { color: theme.colors.success }]}>{err.fix}</Text>
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {err.why}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                {grade.level !== "correct" && !!grade.correctedSentence && (
                  <View style={styles.sampleBlock}>
                    <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                      Corrected
                    </Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontStyle: "italic" }}>
                      {grade.correctedSentence}
                    </Text>
                  </View>
                )}
              </>
            )}
            <View style={styles.sampleBlock}>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Sample answer
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontStyle: "italic" }}>
                {question.answer}
              </Text>
            </View>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

const VERDICTS: Record<WritingLevel, { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  correct: { label: "Correct!", icon: "check-circle" },
  minor: { label: "Almost — minor issues", icon: "alert-circle-outline" },
  incorrect: { label: "Not quite", icon: "close-circle" },
};

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
  sentenceInput: { minHeight: 80 },
  sampleBlock: { gap: 2 },
  gradingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  feedbackBlock: { gap: 12 },
  retryRow: { flexDirection: "row", gap: 8 },
  verdictBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  errorList: { gap: 10 },
  errorItem: { gap: 2 },
  errorWrong: { fontWeight: "700", textDecorationLine: "line-through" },
  errorFix: { fontWeight: "700" },
  actionBtn: { alignSelf: "flex-start" },
});
