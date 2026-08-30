import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Avatar, Button, Chip, Text, TextInput } from "react-native-paper";
import { AppScaffold } from "../components/AppScaffold";
import { useAppTheme } from "../constants/theme";
import { useSupabaseAuth } from "../context/SupabaseAuth";
import { updateDisplayName } from "../Supabase/services/authenticate";
import { fetchAvatars, updateUserAvatar, type Avatar as AvatarOption } from "../Supabase/services/avatars";
import { fetchGenres, fetchUserGenres, type Genre } from "../Supabase/services/genres";
import { fetchAvailableLevels, fetchUserLevel, saveUserLevel, type Level } from "../Supabase/services/levels";
import { saveUserPrefs } from "../Supabase/services/preferences";

const NO_PREFERENCE = "no preference";

export default function PreferencesScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { user } = useSupabaseAuth();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [avatars, setAvatars] = useState<AvatarOption[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [levels, setLevels] = useState<Level[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetchGenres(),
      fetchAvailableLevels(),
      fetchUserLevel(user.id),
      fetchUserGenres(user.id),
      fetchAvatars(),
    ])
      .then(([genreData, levelData, currentLevel, currentGenres, avatarData]) => {
        setGenres(genreData);
        setLevels(levelData);
        setAvatars(avatarData);
        if (currentLevel) setSelectedLevel(currentLevel.level_id);
        if (currentGenres.length > 0) setSelected(new Set(currentGenres.map((g) => g.genre_id)));
        if (user.user_metadata?.display_name) setName(user.user_metadata.display_name);
        if (user.user_metadata?.avatar_url) setSelectedAvatar(user.user_metadata.avatar_url);
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
      if (selectedAvatar) await updateUserAvatar(selectedAvatar);
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
    <AppScaffold title="Your profile" back>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onBackground, fontWeight: "800" }}>
              Welcome to Mockingbird
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
              Let&apos;s set up your profile.
            </Text>
          </View>

          <View style={styles.section}>
            <Text variant="titleMedium" style={{ color: theme.colors.onBackground, fontWeight: "700" }}>
              What should we call you?
            </Text>
            <TextInput mode="outlined" label="Your name" value={name} onChangeText={setName} style={styles.input} />
          </View>

          <View style={styles.section}>
            <Text variant="titleMedium" style={{ color: theme.colors.onBackground, fontWeight: "700" }}>
              Pick your avatar
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
              Choose a profile picture.
            </Text>
            {loading ? (
              <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 24 }} />
            ) : (
              <View style={styles.avatarGrid}>
                {avatars.map((avatar) => {
                  const isSelected = selectedAvatar === avatar.image_url;
                  return (
                    <Pressable
                      key={avatar.avatar_id}
                      onPress={() => setSelectedAvatar(avatar.image_url)}
                      accessibilityRole="button"
                      accessibilityLabel={avatar.title}
                      accessibilityState={{ selected: isSelected }}
                      style={[
                        styles.avatarOption,
                        {
                          borderColor: isSelected ? theme.colors.primary : "transparent",
                          backgroundColor: isSelected ? theme.colors.primaryContainer : "transparent",
                        },
                      ]}
                    >
                      <Avatar.Image
                        size={56}
                        source={{ uri: avatar.image_url }}
                        style={{ backgroundColor: theme.colors.surfaceVariant }}
                      />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text variant="titleMedium" style={{ color: theme.colors.onBackground, fontWeight: "700" }}>
              What&apos;s your current level?
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
              More levels are coming soon.
            </Text>
            {loading ? (
              <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 24 }} />
            ) : (
              <View style={styles.grid}>
                {levels.map((level) => (
                  <Chip
                    key={level.level_id}
                    selected={selectedLevel === level.level_id}
                    showSelectedCheck
                    onPress={() => setSelectedLevel(level.level_id)}
                  >
                    Level {level.level_name}
                  </Chip>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text variant="titleMedium" style={{ color: theme.colors.onBackground, fontWeight: "700" }}>
              What do you like to listen to?
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
              Pick at least one genre to personalize your experience.
            </Text>
            {loading ? (
              <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 24 }} />
            ) : (
              <View style={styles.grid}>
                {genres.map((genre) => (
                  <Chip
                    key={genre.genre_id}
                    icon="music"
                    selected={selected.has(genre.genre_id)}
                    showSelectedCheck
                    onPress={() => toggleGenre(genre)}
                  >
                    {genre.genre_name}
                  </Chip>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleContinue}
            disabled={!canContinue || saving}
            loading={saving}
            contentStyle={styles.continueContent}
          >
            Continue
          </Button>
        </View>
      </KeyboardAvoidingView>
    </AppScaffold>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  header: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 12 },
  section: { paddingHorizontal: 24, paddingTop: 20 },
  input: { marginTop: 12 },
  avatarGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 16, gap: 8 },
  avatarOption: { padding: 4, borderRadius: 34, borderWidth: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 16, gap: 10 },
  footer: { paddingHorizontal: 24, paddingBottom: 24, paddingTop: 12 },
  continueContent: { paddingVertical: 6 },
});
