import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useAppTheme, type AppTheme } from "../constants/theme";
import type { PhonemeAlignment, PronunciationResult as Result, WordAssessment } from "../Supabase/services/transcription";

/** Renders one assessment: a big overall score, then a block per lyric word —
 *  the word, "you said:" with each sound unfilled (right) or red (wrong /
 *  extra / missing), and "correct:" with the target sounds, unfilled where you
 *  already had it right and green where it should have been different — and
 *  finally the whole-line target / spoken IPA. */
export function PronunciationResult({ result }: { result: Result }) {
  const theme = useAppTheme();
  const styles = makeStyles(theme);

  const scoreColor =
    result.score >= 80 ? theme.colors.success : result.score >= 55 ? theme.colors.streak : theme.colors.error;

  return (
    <View style={styles.wrap}>
      <View style={styles.scoreRow}>
        <Text variant="displaySmall" style={[styles.score, { color: scoreColor }]}>
          {result.score}
        </Text>
        <Text variant="titleMedium" style={styles.scoreUnit}>
          / 100
        </Text>
      </View>

      {result.words.length > 0 ? (
        <View style={styles.words}>
          {result.words.map((w, i) => (
            <View key={i} style={styles.wordRow}>
              <View style={[styles.wordBadge, wordIsPerfect(w) ? styles.wordBadgeRight : styles.wordBadgeWrong]}>
                <Text variant="titleMedium" style={[styles.wordText, wordIsPerfect(w) ? styles.wordTextRight : styles.wordTextWrong]}>
                  {w.word}
                </Text>
              </View>
              <View style={styles.lineRow}>
                <Text variant="bodyMedium" style={styles.lineLabel}>
                  you said:
                </Text>
                {w.alignment.map((a, j) => (
                  <SaidChip key={j} a={a} styles={styles} />
                ))}
              </View>
              <View style={styles.lineRow}>
                <Text variant="bodyMedium" style={styles.lineLabel}>
                  correct:
                </Text>
                {w.alignment.map((a, j) => (a.target ? <CorrectChip key={j} a={a} styles={styles} /> : null))}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.strip}>
          {result.alignment.map((a, i) => (
            <PhoneChip key={i} a={a} styles={styles} />
          ))}
        </View>
      )}

      <View style={styles.ipaBlock}>
        <Text variant="labelSmall" style={styles.ipaLabel}>
          TARGET
        </Text>
        <Text variant="bodyMedium" style={styles.ipa} selectable>
          /{result.targetIpa}/
        </Text>
        <Text variant="labelSmall" style={styles.ipaLabel}>
          YOU SAID
        </Text>
        <Text variant="bodyMedium" style={styles.ipa} selectable>
          {result.spokenIpa ? `/${result.spokenIpa}/` : "No speech detected — try recording again."}
        </Text>
      </View>
    </View>
  );
}

/** A word counts as pronounced correctly only if every one of its sounds matched. */
function wordIsPerfect(w: WordAssessment): boolean {
  return w.alignment.length > 0 && w.alignment.every((a) => a.op === "equal");
}

/** One sound the user made for a word: unfilled if it matched the target, red
 *  if it was wrong or extra, and a red dash where a target sound was left out. */
function SaidChip({ a, styles }: { a: PhonemeAlignment; styles: ReturnType<typeof makeStyles> }) {
  const right = a.op === "equal";
  return (
    <View style={[styles.chip, right ? styles.chipUnchanged : styles.chipSub]}>
      <Text style={right ? styles.chipUnchangedText : styles.chipWrongText}>{a.spoken ?? "–"}</Text>
    </View>
  );
}

/** One target sound: unfilled if the user already said it right (unchanged),
 *  green if it's the sound they should have made instead. */
function CorrectChip({ a, styles }: { a: PhonemeAlignment; styles: ReturnType<typeof makeStyles> }) {
  const right = a.op === "equal";
  return (
    <View style={[styles.chip, right ? styles.chipUnchanged : styles.chipEqual]}>
      <Text style={right ? styles.chipUnchangedText : styles.chipEqualText}>{a.target}</Text>
    </View>
  );
}

function PhoneChip({ a, styles }: { a: PhonemeAlignment; styles: ReturnType<typeof makeStyles> }) {
  if (a.op === "insert") {
    return (
      <View style={[styles.chip, styles.chipInsert]}>
        <Text style={styles.chipInsertText}>+{a.spoken}</Text>
      </View>
    );
  }
  const style = a.op === "equal" ? styles.chipEqual : a.op === "sub" ? styles.chipSub : styles.chipDelete;
  const textStyle =
    a.op === "equal" ? styles.chipEqualText : a.op === "sub" ? styles.chipSubText : styles.chipDeleteText;
  return (
    <View style={[styles.chip, style]}>
      <Text style={textStyle}>{a.target}</Text>
      {a.op === "sub" && <Text style={styles.chipHeard}>{a.spoken}</Text>}
    </View>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    wrap: { marginTop: 14, gap: 16 },
    scoreRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
    score: { fontWeight: "800" },
    scoreUnit: { color: theme.colors.onSurfaceVariant },

    words: { gap: 14 },
    wordRow: { gap: 6 },
    // The word is highlighted (not recoloured): green if every sound matched, red otherwise.
    wordBadge: { alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
    wordBadgeRight: { backgroundColor: theme.colors.success },
    wordBadgeWrong: { backgroundColor: theme.colors.errorContainer },
    wordText: { fontFamily: "Nunito_700Bold" },
    wordTextRight: { color: theme.colors.onSuccess },
    wordTextWrong: { color: theme.colors.onErrorContainer },
    lineRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
    lineLabel: { color: theme.colors.onSurfaceVariant, fontFamily: "Nunito_400Regular", marginRight: 2 },
    // Right sounds get no fill, but keep the chip box so spacing matches.
    chipUnchanged: { backgroundColor: "transparent" },
    chipUnchangedText: { color: theme.colors.onSurface, fontFamily: "Nunito_700Bold", fontSize: 15 },
    chipWrongText: { color: theme.colors.onErrorContainer, fontFamily: "Nunito_700Bold", fontSize: 15 },

    strip: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    chip: { minWidth: 26, alignItems: "center", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4 },
    chipEqual: { backgroundColor: theme.colors.success },
    chipEqualText: { color: theme.colors.onSuccess, fontFamily: "Nunito_700Bold", fontSize: 15 },
    chipSub: { backgroundColor: theme.colors.errorContainer },
    chipSubText: {
      color: theme.colors.onErrorContainer,
      fontFamily: "Nunito_700Bold",
      fontSize: 15,
      textDecorationLine: "line-through",
    },
    chipHeard: { color: theme.colors.onErrorContainer, fontFamily: "Nunito_400Regular", fontSize: 12 },
    chipDelete: {
      backgroundColor: theme.colors.surfaceVariant,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      borderStyle: "dashed",
    },
    chipDeleteText: { color: theme.colors.onSurfaceVariant, fontFamily: "Nunito_700Bold", fontSize: 15, opacity: 0.6 },
    chipInsert: { backgroundColor: theme.colors.streakContainer },
    chipInsertText: { color: theme.colors.onStreakContainer, fontFamily: "Nunito_400Regular", fontSize: 13 },

    ipaBlock: { gap: 2 },
    ipaLabel: { color: theme.colors.onSurfaceVariant, marginTop: 6, letterSpacing: 1 },
    ipa: { color: theme.colors.onSurface, fontFamily: "Nunito_400Regular" },
  });
