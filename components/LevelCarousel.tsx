import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Text } from "react-native-paper";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from "react-native-svg";
import { useAppTheme, type AppTheme } from "../constants/theme";
import type { LevelEntry, LevelStatus } from "../hooks/useLevelProgress";

// An icon per level, so each card in the carousel reads at a glance. Levels
// beyond the list fall back to a generic badge.
const LEVEL_ICONS = ["sprout", "leaf", "flower-tulip", "tree", "trophy", "crown"] as const;
const DEFAULT_LEVEL_ICON = "medal-outline";

function levelIconFor(levelName: string): keyof typeof MaterialCommunityIcons.glyphMap {
  const n = Number(levelName);
  return (LEVEL_ICONS[n - 1] ?? DEFAULT_LEVEL_ICON) as keyof typeof MaterialCommunityIcons.glyphMap;
}

const STATUS_LABEL: Record<LevelStatus, string> = {
  completed: "Completed",
  in_progress: "In Progress",
  not_started: "Not Started",
};

const CARD_HEIGHT = 156;

/** Snap-scrolling carousel of level cards (gradient by status) with page
 *  dots — the top of the Lessons page and the Practice tab's Flashcards
 *  section. Opens on `initialLevelName` (the user's level) once known.
 *  Tapping a card calls `onPressCard`, or just brings it to the center when
 *  none is given. */
export function LevelCarousel({
  levels,
  statusOf,
  isLevelLocked,
  initialLevelName,
  onActiveChange,
  onPressCard,
}: {
  levels: LevelEntry[];
  statusOf: (topics: LevelEntry["topics"]) => LevelStatus;
  isLevelLocked: (levelName: string) => boolean;
  initialLevelName?: string | null;
  onActiveChange?: (index: number) => void;
  onPressCard?: (level: LevelEntry, index: number) => void;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width } = useWindowDimensions();

  // Carousel geometry: current card 60% of the screen, with the previous/next
  // cards peeking ~15% on either side (5% gap between cards makes up the rest).
  const CARD_WIDTH = Math.round(width * 0.6);
  const SPACING = Math.round(width * 0.05);
  const SIDE_PAD = Math.round((width - CARD_WIDTH - SPACING) / 2);
  const SNAP = CARD_WIDTH + SPACING;

  const [activeIndex, setActiveIndexState] = useState(0);
  const didInitIndex = useRef(false);
  const listRef = useRef<FlatList<LevelEntry>>(null);

  const setActiveIndex = useCallback(
    (idx: number) => {
      setActiveIndexState(idx);
      onActiveChange?.(idx);
    },
    [onActiveChange]
  );

  // Open the carousel on the user's current level once both the levels and the
  // user's level have loaded (only the first time).
  useEffect(() => {
    if (didInitIndex.current || levels.length === 0 || !initialLevelName) return;
    const idx = levels.findIndex((l) => l.levelName === initialLevelName);
    if (idx > 0) {
      didInitIndex.current = true;
      setActiveIndex(idx);
      // Let the list mount/layout first, then bring the current level into view.
      requestAnimationFrame(() => listRef.current?.scrollToIndex({ index: idx, animated: false }));
    } else if (idx === 0) {
      didInitIndex.current = true;
    }
  }, [levels, initialLevelName, setActiveIndex]);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / SNAP);
      setActiveIndex(Math.max(0, Math.min(idx, levels.length - 1)));
    },
    [SNAP, levels.length, setActiveIndex]
  );

  const goToIndex = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(idx, levels.length - 1));
      setActiveIndex(clamped);
      listRef.current?.scrollToIndex({ index: clamped, animated: true });
    },
    [levels.length, setActiveIndex]
  );

  const renderCard = useCallback(
    ({ item, index }: { item: LevelEntry; index: number }) => {
      const status = statusOf(item.topics);
      const locked = isLevelLocked(item.levelName);
      const focusArea = item.topics.find((t) => t.focus_area)?.focus_area ?? null;
      const active = index === activeIndex;

      // Status drives the card's gradient so the carousel reads at a glance.
      const [g1, g2] = locked
        ? [theme.colors.surfaceVariant, theme.colors.surfaceDisabled]
        : status === "completed"
          ? [theme.colors.success, theme.colors.secondary]
          : status === "in_progress"
            ? [theme.colors.primary, theme.colors.accentIndigo]
            : [theme.colors.surfaceVariant, theme.colors.primaryContainer];
      const onCard = locked || status === "not_started" ? theme.colors.onSurfaceVariant : "#FFFFFF";
      const gradId = `lvl-grad-${item.levelName}`;

      return (
        <Pressable
          onPress={() => (onPressCard ? onPressCard(item, index) : goToIndex(index))}
          style={[
            styles.card,
            { width: CARD_WIDTH, marginHorizontal: SPACING / 2, opacity: locked ? 0.65 : 1 },
            active && styles.cardActive,
          ]}
        >
          <Svg width={CARD_WIDTH} height={CARD_HEIGHT} style={StyleSheet.absoluteFill}>
            <Defs>
              <SvgLinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={g1} />
                <Stop offset="1" stopColor={g2} />
              </SvgLinearGradient>
            </Defs>
            <Rect x="0" y="0" width={CARD_WIDTH} height={CARD_HEIGHT} rx={24} fill={`url(#${gradId})`} />
          </Svg>

          <View style={styles.cardBody}>
            <View style={styles.cardTextCol}>
              {focusArea && (
                <Text variant="bodySmall" style={[styles.cardFocus, { color: onCard }]} numberOfLines={1}>
                  Level {item.levelName}
                </Text>
              )}
              <Text variant="headlineSmall" style={[styles.cardTitle, { color: onCard }]} numberOfLines={2}>
                {focusArea ?? `Level ${item.levelName}`}
              </Text>
              <Text variant="titleSmall" style={[styles.cardStatus, { color: onCard }]}>
                {locked ? "Locked" : STATUS_LABEL[status]}
              </Text>
            </View>
            <MaterialCommunityIcons
              name={locked ? "lock" : levelIconFor(item.levelName)}
              size={40}
              color={onCard}
              style={styles.cardIcon}
            />
          </View>
        </Pressable>
      );
    },
    [activeIndex, CARD_WIDTH, SPACING, goToIndex, isLevelLocked, onPressCard, statusOf, styles, theme]
  );

  return (
    <>
      <View style={styles.carouselWrap}>
        <FlatList
          ref={listRef}
          data={levels}
          keyExtractor={(l) => l.levelName}
          renderItem={renderCard}
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={SNAP}
          snapToAlignment="start"
          disableIntervalMomentum
          contentContainerStyle={{ paddingHorizontal: SIDE_PAD }}
          onMomentumScrollEnd={onMomentumEnd}
          getItemLayout={(_, index) => ({ length: SNAP, offset: SNAP * index, index })}
          initialScrollIndex={activeIndex}
          onScrollToIndexFailed={({ index }) => {
            setTimeout(() => listRef.current?.scrollToIndex({ index, animated: false }), 0);
          }}
        />
      </View>

      {/* Page indicator dots */}
      <View style={styles.dots}>
        {levels.map((l, i) => (
          <Pressable key={l.levelName} onPress={() => goToIndex(i)} hitSlop={8}>
            <View style={[styles.dot, i === activeIndex && styles.dotActive]} />
          </Pressable>
        ))}
      </View>
    </>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    carouselWrap: { height: CARD_HEIGHT },
    card: {
      height: CARD_HEIGHT,
      borderRadius: 24,
      overflow: "hidden",
      justifyContent: "center",
    },
    cardActive: {
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    cardBody: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
    },
    cardTextCol: { flex: 1, paddingRight: 8 },
    cardTitle: { fontWeight: "800" },
    cardFocus: { opacity: 0.9, marginTop: 2 },
    cardStatus: { fontWeight: "700", marginTop: 10, opacity: 0.95 },
    cardIcon: { opacity: 0.95 },

    dots: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 16, gap: 8 },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.outlineVariant },
    dotActive: { backgroundColor: theme.colors.primary, width: 20 },
  });
