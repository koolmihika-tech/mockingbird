import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, View, type StyleProp, type TextStyle } from "react-native";
import { ActivityIndicator, Button, Card, Text, TextInput } from "react-native-paper";
import { useAppTheme } from "../constants/theme";
import { Question } from "../Supabase/services/questions";
import { gradeWriting, type WritingGrade, type WritingLevel } from "../Supabase/services/writingGrade";

// The rule behind the answer, shown once the learner has answered so every
// question teaches as well as tests. Renders nothing if the question has none.
function Explanation({ text }: { text?: string }) {
  const theme = useAppTheme();
  if (!text) return null;
  return (
    <View style={[styles.explanation, { backgroundColor: theme.colors.surface }]}>
      <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={theme.colors.primary} />
      <Text variant="bodyMedium" style={[styles.explanationText, { color: theme.colors.onSurface }]}>
        {text}
      </Text>
    </View>
  );
}

// Renders text with **…** spans in bold — the target word in a vocab
// sentence, or the conjugated verb in a pattern example.
function Emphasized({
  text,
  style,
  variant = "titleMedium",
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  variant?: "titleMedium" | "bodySmall";
}) {
  const parts = text.split(/\*\*(.+?)\*\*/);
  return (
    <Text variant={variant} style={style}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Text key={i} style={styles.emphasis}>
            {part}
          </Text>
        ) : (
          part
        )
      )}
    </Text>
  );
}

// Bold-marked Spanish line with its English translation (if any) beneath.
// `hideAnswer` blanks out the translation's **…** spans — on a vocab
// question they're the word's meaning, i.e. the answer.
function TranslatedLine({ text, translation, hideAnswer }: { text: string; translation?: string; hideAnswer?: boolean }) {
  const theme = useAppTheme();
  return (
    <View>
      <Emphasized text={text} style={{ color: theme.colors.onSurface }} />
      {!!translation && (
        <Emphasized
          text={hideAnswer ? translation.replace(/\*\*(.+?)\*\*/g, "**____**") : translation}
          variant="bodySmall"
          style={[styles.translation, { color: theme.colors.onSurfaceVariant }]}
        />
      )}
    </View>
  );
}

// Pattern-recognition examples, shown above the prompt.
function ExamplesBox({ question }: { question: Question }) {
  const theme = useAppTheme();
  if (!question.examples?.length) return null;
  return (
    <View style={[styles.contextBox, { backgroundColor: theme.colors.surface }]}>
      <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        Spot the pattern
      </Text>
      {question.examples.map((ex, i) => (
        <TranslatedLine key={i} text={ex.text} translation={ex.translation} />
      ))}
    </View>
  );
}

// The question's Spanish sentence (a vocab word in context, or the sentence
// with the blank to fill in), shown below the prompt.
function SentenceBox({ question, hideAnswer }: { question: Question; hideAnswer?: boolean }) {
  const theme = useAppTheme();
  if (!question.sentence) return null;
  return (
    <View style={[styles.contextBox, { backgroundColor: theme.colors.surface }]}>
      <TranslatedLine text={question.sentence} translation={question.translation} hideAnswer={hideAnswer} />
    </View>
  );
}

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
        <ExamplesBox question={question} />
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 12 }}>
          {question.prompt}
        </Text>
        <SentenceBox question={question} hideAnswer={selected == null} />
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
        {selected != null && <Explanation text={question.explanation} />}
      </Card.Content>
    </Card>
  );
}

// Case/whitespace/accent-insensitive comparison — typing accents is
// inconvenient on most keyboards, so "esta noche" should match "está noche".
// Questions where an accent is the whole difference (preterite habló vs
// present hablo) set accentSensitive, and are compared with accents kept.
function normalizeAnswer(s: string, keepAccents = false): string {
  const lower = s.trim().toLowerCase().normalize("NFC");
  return keepAccents ? lower : lower.normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "");
}

// Fill-in-the-blank: user types an answer and it's checked against the
// expected answer (case/whitespace-insensitive; accent-insensitive unless
// the question is accentSensitive). Pattern-recognition questions are
// fill-in-the-blanks with example sentences shown above the prompt.
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
  const strict = !!question.accentSensitive;
  const isCorrect = normalizeAnswer(value, strict) === normalizeAnswer(question.answer, strict);
  // Right letters, wrong (or missing) accent — worth calling out specifically.
  const accentOnly = strict && !isCorrect && normalizeAnswer(value) === normalizeAnswer(question.answer);

  function handleCheck() {
    setChecked(true);
    onAnswered?.(isCorrect);
  }

  return (
    <Card mode="contained" style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}>
      <Card.Content>
        <ExamplesBox question={question} />
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 12 }}>
          {question.prompt}
        </Text>
        <SentenceBox question={question} />
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
        {strict && !checked && /[áéíóú]/i.test(question.answer) && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 10 }}>
            Accents count here. Hold a letter on your keyboard to add one.
          </Text>
        )}
        {checked ? (
          <>
            <Text variant="bodyMedium" style={{ color: isCorrect ? theme.colors.success : theme.colors.onSurface, fontStyle: "italic" }}>
              {isCorrect
                ? "¡Correcto!"
                : accentOnly
                ? `Almost — check the accent: ${question.answer}`
                : `Correct answer: ${question.answer}`}
            </Text>
            <Explanation text={question.explanation} />
          </>
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
            <Explanation text={question.explanation} />
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
  explanation: { flexDirection: "row", gap: 8, borderRadius: 12, padding: 12, marginTop: 12 },
  explanationText: { flex: 1 },
  contextBox: { borderRadius: 12, padding: 12, marginBottom: 12, gap: 10 },
  translation: { marginTop: 2, fontStyle: "italic" },
  emphasis: { fontWeight: "800" },
});
