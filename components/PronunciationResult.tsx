import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useAppTheme, type AppTheme } from "../constants/theme";
import type { PhonemeAlignment, PronunciationResult as Result } from "../Supabase/services/pronunciation";

/** Renders one assessment: a big score, the two IPA strings, and a phone-by-phone
 *  strip coloured by how each target phone came out. */
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

      <View style={styles.strip}>
        {result.alignment.map((a, i) => (
          <PhoneChip key={i} a={a} styles={styles} />
        ))}
      </View>

      <View style={styles.ipaBlock}>
        <Text variant="labelSmall" style={styles.ipaLabel}>
          TARGET
        </Text>
        <Text variant="bodyMedium" style={styles.ipa}>
          /{result.targetIpa}/
        </Text>
        <Text variant="labelSmall" style={styles.ipaLabel}>
          YOU SAID
        </Text>
        <Text variant="bodyMedium" style={styles.ipa}>
          /{result.spokenIpa}/
        </Text>
      </View>
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
  const style =
    a.op === "equal" ? styles.chipEqual : a.op === "sub" ? styles.chipSub : styles.chipDelete;
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

    strip: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    chip: { minWidth: 26, alignItems: "center", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4 },
    chipEqual: { backgroundColor: theme.colors.successContainer },
    chipEqualText: { color: theme.colors.onSuccessContainer, fontFamily: "Nunito_700Bold", fontSize: 15 },
    chipSub: { backgroundColor: theme.colors.errorContainer },
    chipSubText: { color: theme.colors.onErrorContainer, fontFamily: "Nunito_700Bold", fontSize: 15, textDecorationLine: "line-through" },
    chipHeard: { color: theme.colors.onErrorContainer, fontFamily: "Nunito_400Regular", fontSize: 12 },
    chipDelete: { backgroundColor: theme.colors.surfaceVariant, borderWidth: 1, borderColor: theme.colors.outlineVariant, borderStyle: "dashed" },
    chipDeleteText: { color: theme.colors.onSurfaceVariant, fontFamily: "Nunito_700Bold", fontSize: 15, opacity: 0.6 },
    chipInsert: { backgroundColor: theme.colors.streakContainer },
    chipInsertText: { color: theme.colors.onStreakContainer, fontFamily: "Nunito_400Regular", fontSize: 13 },

    ipaBlock: { gap: 2 },
    ipaLabel: { color: theme.colors.onSurfaceVariant, marginTop: 6, letterSpacing: 1 },
    ipa: { color: theme.colors.onSurface, fontFamily: "Nunito_400Regular" },
  });
