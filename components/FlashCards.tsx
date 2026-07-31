import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text as RNText, View } from "react-native";
import { Text } from "react-native-paper";
import { useAppTheme, type AppTheme } from "../constants/theme";

/** Flip-card vocabulary carousel — shared by the song player page and the
 *  dedicated Flashcards page reached from the song hub. */
export function FlashCardCarousel({ entries, color }: { entries: [string, string][]; color: string }) {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const [index, setIndex] = useState(0);
  const [word, definition] = entries[index];

  return (
    <View style={styles.flashcardsSection}>
      <Text variant="bodySmall" style={styles.sectionSubheader}>
        Tap a card to flip • {index + 1} of {entries.length}
      </Text>
      <View style={styles.carouselRow}>
        <Pressable
          onPress={() => setIndex((i) => Math.max(0, i - 1))}
          style={[styles.arrowBtn, index === 0 && styles.arrowBtnDisabled]}
          disabled={index === 0}
        >
          <MaterialCommunityIcons name="chevron-left" size={26} style={styles.arrowText} />
        </Pressable>
        <FlashCard key={word} word={word} definition={definition} color={color} />
        <Pressable
          onPress={() => setIndex((i) => Math.min(entries.length - 1, i + 1))}
          style={[styles.arrowBtn, index === entries.length - 1 && styles.arrowBtnDisabled]}
          disabled={index === entries.length - 1}
        >
          <MaterialCommunityIcons name="chevron-right" size={26} style={styles.arrowText} />
        </Pressable>
      </View>
    </View>
  );
}

function FlashCard({ word, definition, color }: { word: string; definition: string; color: string }) {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const [flipped, setFlipped] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  function flip() {
    Animated.spring(anim, { toValue: flipped ? 0 : 1, friction: 8, useNativeDriver: true }).start();
    setFlipped(!flipped);
  }

  const frontRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const backRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });

  return (
    <Pressable onPress={flip} style={styles.cardWrapper}>
      <Animated.View style={[styles.flashCard, { backgroundColor: color, transform: [{ rotateY: frontRotate }] }]}>
        <RNText style={styles.flashCardWord}>{word}</RNText>
        <RNText style={styles.flashCardHint}>tap to reveal</RNText>
      </Animated.View>
      <Animated.View style={[styles.flashCard, styles.flashCardBack, { backgroundColor: color, transform: [{ rotateY: backRotate }] }]}>
        <RNText style={styles.flashCardDefinition}>{definition}</RNText>
      </Animated.View>
    </Pressable>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    flashcardsSection: { width: "100%", marginBottom: 28 },
    sectionSubheader: { color: theme.colors.onSurfaceVariant, marginBottom: 16 },
    carouselRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    arrowBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primaryContainer,
      borderRadius: 20,
    },
    arrowBtnDisabled: { opacity: 0.3 },
    arrowText: { color: theme.colors.onPrimaryContainer },
    cardWrapper: { flex: 1, height: 140 },
    flashCard: {
      position: "absolute",
      width: "100%",
      height: "100%",
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backfaceVisibility: "hidden",
      elevation: 2,
      padding: 12,
    },
    flashCardBack: { position: "absolute" },
    flashCardWord: { color: "#3B2A1F", fontFamily: "Nunito_700Bold", fontSize: 18, textAlign: "center" },
    flashCardHint: { color: "#3B2A1F", opacity: 0.7, fontFamily: "Nunito_400Regular", fontSize: 10, marginTop: 6 },
    flashCardDefinition: { color: "#3B2A1F", fontFamily: "Nunito_400Regular", fontSize: 15, textAlign: "center", fontStyle: "italic" },
  });
