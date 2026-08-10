import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import Svg, { Path } from "react-native-svg";
import { useAppTheme, withAlpha, type AppTheme } from "../constants/theme";

// Semicircle "credit score"-style gauge: an arc from 0-100 with a tier chip
// underneath. Accuracy comes from Supabase/services/mastery.ts, averaged from
// lesson_history.total_accuracy per levels.focus_area. Topics with no
// attempts yet (accuracy: null) render as an empty grey ring.

const SIZE = 140;
const STROKE_WIDTH = 14;
const RADIUS = SIZE / 2 - STROKE_WIDTH / 2;
const CENTER = SIZE / 2;

function polarToCartesian(angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 180) * Math.PI) / 180;
  return {
    x: CENTER + RADIUS * Math.cos(angleInRadians),
    y: CENTER + RADIUS * Math.sin(angleInRadians),
  };
}

// Describes an arc from startAngle to endAngle (0 = left, 180 = right, sweeping over the top).
function describeArc(startAngle: number, endAngle: number) {
  const start = polarToCartesian(endAngle);
  const end = polarToCartesian(startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

// Cool blue -> purple ramp, all pulled from the app's existing brand tokens.
function tierFor(theme: AppTheme, accuracy: number) {
  if (accuracy >= 90) return { label: "Mastered", color: theme.colors.primary };
  if (accuracy >= 75) return { label: "Proficient", color: theme.colors.accentIndigo };
  if (accuracy >= 50) return { label: "Developing", color: theme.colors.accentBlue };
  return { label: "Needs practice", color: theme.colors.accentSky };
}

export function MasteryDial({
  topic,
  accuracy,
  onPressDetails,
}: {
  topic: string;
  accuracy: number | null;
  onPressDetails?: () => void;
}) {
  const theme = useAppTheme();
  const started = accuracy != null;
  const tier = started ? tierFor(theme, accuracy) : { label: "Not started", color: theme.colors.outline };
  const progress = started ? Math.max(0, Math.min(100, accuracy)) : 0;

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SIZE / 2 + STROKE_WIDTH / 2} viewBox={`0 0 ${SIZE} ${SIZE / 2 + STROKE_WIDTH / 2}`}>
        <Path
          d={describeArc(0, 180)}
          stroke={theme.colors.surfaceVariant}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          fill="none"
        />
        {started && progress > 0 && (
          <Path
            d={describeArc(0, (progress / 100) * 180)}
            stroke={tier.color}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            fill="none"
          />
        )}
      </Svg>
      <Text variant="headlineMedium" style={[styles.value, { color: started ? theme.colors.onBackground : theme.colors.onSurfaceVariant }]}>
        {started ? progress : "—"}
      </Text>
      <Text variant="labelLarge" style={[styles.topic, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
        {topic}
      </Text>
      <View
        style={[
          styles.tierChip,
          {
            backgroundColor: started ? withAlpha(tier.color, 0.16) : withAlpha(theme.colors.outline, 0.1),
            borderColor: started ? withAlpha(tier.color, 0.4) : withAlpha(theme.colors.outline, 0.3),
          },
        ]}
      >
        <Text variant="labelSmall" style={[styles.tierText, { color: tier.color }]}>
          {tier.label}
        </Text>
      </View>
      {onPressDetails && (
        <Pressable onPress={onPressDetails} hitSlop={8} style={styles.detailsBtn}>
          <Text variant="labelSmall" style={[styles.detailsText, { color: theme.colors.primary }]}>
            View details
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: SIZE, alignItems: "center" },
  value: { marginTop: -4 },
  topic: { textAlign: "center", marginTop: 2, minHeight: 32 },
  tierChip: { marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  tierText: { fontWeight: "600" },
  detailsBtn: { marginTop: 10, padding: 4 },
  detailsText: { textDecorationLine: "underline" },
});
