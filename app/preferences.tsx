import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSupabaseAuth } from "../context/SupabaseAuth";
import { fetchGenres, type Genre } from "../Supabase/services/genres";
import { saveUserPrefs } from "../Supabase/services/preferences";

const NO_PREFERENCE = "no preference";

export default function PreferencesScreen() {
  const router = useRouter();
  const { user } = useSupabaseAuth();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGenres()
      .then(setGenres)
      .catch(() => Alert.alert("Error", "Could not load genres."))
      .finally(() => setLoading(false));
  }, []);

  function toggleGenre(genre: Genre) {
    const isNoPreference = genre.genre_name.trim().toLowerCase() === NO_PREFERENCE;

    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(genre.genre_id)) {
        next.delete(genre.genre_id);
        return next;
      }

      if (isNoPreference) {
        return new Set([genre.genre_id]);
      }

      genres
        .filter((g) => g.genre_name.trim().toLowerCase() === NO_PREFERENCE)
        .forEach((g) => next.delete(g.genre_id));
      next.add(genre.genre_id);
      return next;
    });
  }

  async function handleContinue() {
    if (!user || selected.size === 0) return;

    setSaving(true);
    try {
      await saveUserPrefs(user.id, Array.from(selected));
      router.replace("/");
    } catch {
      Alert.alert("Error", "Could not save your preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>What do you like to listen to?</Text>
        <Text style={styles.subtitle}>Pick at least one genre to personalize your experience.</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#5C3D2E" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.grid}>
          {genres.map((genre) => {
            const isSelected = selected.has(genre.genre_id);
            return (
              <Pressable
                key={genre.genre_id}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => toggleGenre(genre)}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {genre.genre_name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Pressable
          style={[styles.continueBtn, selected.size === 0 && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={selected.size === 0 || saving}
        >
          {saving ? (
            <ActivityIndicator color="#5C3D2E" />
          ) : (
            <Text style={styles.continueText}>Continue</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FDF6EC",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontFamily: "Courier New",
    fontWeight: "bold",
    color: "#5C3D2E",
  },
  subtitle: {
    fontFamily: "Courier New",
    fontSize: 14,
    color: "#8B6347",
    marginTop: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
  },
  chip: {
    backgroundColor: "#FFF3E0",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E8D5C0",
  },
  chipSelected: {
    backgroundColor: "#E8C5A0",
    borderColor: "#5C3D2E",
  },
  chipText: {
    fontFamily: "Courier New",
    fontSize: 14,
    color: "#5C3D2E",
  },
  chipTextSelected: {
    fontWeight: "600",
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
  },
  continueBtn: {
    backgroundColor: "#E8C5A0",
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: "center",
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  continueText: {
    fontFamily: "Courier New",
    fontSize: 16,
    fontWeight: "600",
    color: "#5C3D2E",
  },
});
