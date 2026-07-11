import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSupabaseAuth } from "../context/SupabaseAuth";
import { updateDisplayName } from "../Supabase/services/authenticate";
import { fetchGenres, fetchUserGenres, type Genre } from "../Supabase/services/genres";
import { fetchAvailableLevels, fetchUserLevel, saveUserLevel, type Level } from "../Supabase/services/levels";
import { saveUserPrefs } from "../Supabase/services/preferences";

const NO_PREFERENCE = "no preference";

export default function PreferencesScreen() {
  const router = useRouter();
  const { user } = useSupabaseAuth();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [levels, setLevels] = useState<Level[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchGenres(), fetchAvailableLevels(), fetchUserLevel(user.id), fetchUserGenres(user.id)])
      .then(([genreData, levelData, currentLevel, currentGenres]) => {
        setGenres(genreData);
        setLevels(levelData);
        if (currentLevel) setSelectedLevel(currentLevel.level_id);
        if (currentGenres.length > 0) setSelected(new Set(currentGenres.map((g) => g.genre_id)));
        if (user.user_metadata?.display_name) setName(user.user_metadata.display_name);
      })
      .catch((e) => {
        console.error("Failed to load preferences:", e);
        Alert.alert("Error", "Could not load your options.");
      })
      .finally(() => setLoading(false));
  }, [user]);

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

  const canContinue = name.trim().length > 0 && selected.size > 0 && selectedLevel !== null;

  async function handleContinue() {
    if (!user || !canContinue || !selectedLevel) return;

    setSaving(true);
    try {
      await updateDisplayName(name.trim());
      await saveUserPrefs(user.id, Array.from(selected));
      await saveUserLevel(user.id, selectedLevel);
      router.replace("/profile");
    } catch (e) {
      console.error("Failed to save preferences:", e);
      Alert.alert("Error", "Could not save your details. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to Mockingbird</Text>
            <Text style={styles.subtitle}>Let's set up your profile.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What should we call you?</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor="#8B6347"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What's your current level?</Text>
            <Text style={styles.sectionSubtitle}>More levels are coming soon.</Text>

            {loading ? (
              <ActivityIndicator color="#5C3D2E" style={{ marginTop: 24 }} />
            ) : (
              <View style={styles.grid}>
                {levels.map((level) => {
                  const isSelected = selectedLevel === level.level_id;
                  return (
                    <Pressable
                      key={level.level_id}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => setSelectedLevel(level.level_id)}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        Level {level.level_name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What do you like to listen to?</Text>
            <Text style={styles.sectionSubtitle}>Pick at least one genre to personalize your experience.</Text>

            {loading ? (
              <ActivityIndicator color="#5C3D2E" style={{ marginTop: 24 }} />
            ) : (
              <View style={styles.grid}>
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
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
            onPress={handleContinue}
            disabled={!canContinue || saving}
          >
            {saving ? (
              <ActivityIndicator color="#5C3D2E" />
            ) : (
              <Text style={styles.continueText}>Continue</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FDF6EC",
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
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
  section: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  sectionTitle: {
    fontFamily: "Courier New",
    fontSize: 16,
    fontWeight: "bold",
    color: "#5C3D2E",
  },
  sectionSubtitle: {
    fontFamily: "Courier New",
    fontSize: 13,
    color: "#8B6347",
    marginTop: 6,
  },
  input: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E8D5C0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: "Courier New",
    fontSize: 14,
    color: "#5C3D2E",
    backgroundColor: "#FFF8F0",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
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
