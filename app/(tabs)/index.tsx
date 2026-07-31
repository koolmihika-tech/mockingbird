import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Appbar, Button, Card, Modal, Portal, Surface, Text, TextInput } from "react-native-paper";
import { AppScaffold } from "../../components/AppScaffold";
import { useAppTheme } from "../../constants/theme";
import { useSupabaseAuth } from "../../context/SupabaseAuth";
import { SONGS } from "../../data/songs";
import { getLoginStreak } from "../../Supabase/services/streak";

type SectionIcon = keyof typeof MaterialCommunityIcons.glyphMap;
type Tone = "primary" | "tertiary" | "secondary" | "streak";
const SECTIONS: { label: string; route: string; icon: SectionIcon; tone: Tone }[] = [
  { label: "Songs", route: "/songs", icon: "music-clef-treble", tone: "primary" },
  { label: "Reading/Writing", route: "/reading/writing", icon: "book-open-variant", tone: "tertiary" },
  { label: "Listening", route: "/listening", icon: "headphones", tone: "secondary" },
  { label: "Speaking", route: "/speaking", icon: "microphone-variant", tone: "streak" },
];

export default function Home() {
  const router = useRouter();
  const theme = useAppTheme();
  const { user, login, signup, loginWithGoogle, logout, isLoading, error: authError } = useSupabaseAuth();
  const [modalMode, setModalMode] = useState<"login" | "signup" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setStreak(null);
      return;
    }
    getLoginStreak(user.id)
      .then(setStreak)
      .catch(() => setStreak(null));
  }, [user]);

  function openModal(mode: "login" | "signup") {
    setEmail("");
    setPassword("");
    setModalMode(mode);
  }

  async function handleSubmit() {
    if (modalMode === "login") {
      await login(email, password);
    } else {
      await signup(email, password);
    }
    if (!authError) setModalMode(null);
  }

  async function handleGoogleSubmit() {
    await loginWithGoogle();
    if (!authError) setModalMode(null);
  }

  const displayName = user?.user_metadata?.display_name ?? null;
  const toneColor = (tone: Tone) =>
    tone === "primary"
      ? theme.colors.primaryContainer
      : tone === "tertiary"
      ? theme.colors.tertiaryContainer
      : tone === "secondary"
      ? theme.colors.secondaryContainer
      : theme.colors.streakContainer;
  const onToneColor = (tone: Tone) =>
    tone === "primary"
      ? theme.colors.onPrimaryContainer
      : tone === "tertiary"
      ? theme.colors.onTertiaryContainer
      : tone === "secondary"
      ? theme.colors.onSecondaryContainer
      : theme.colors.onStreakContainer;

  const authActions = isLoading ? null : user ? (
    <Appbar.Action icon="logout" onPress={logout} accessibilityLabel="Log out" />
  ) : (
    <>
      <Appbar.Action icon="login" onPress={() => openModal("login")} accessibilityLabel="Log in" />
      <Appbar.Action icon="account-plus" onPress={() => openModal("signup")} accessibilityLabel="Sign up" />
    </>
  );

  return (
    <AppScaffold title="Mockingbird" rightActions={authActions} reversedHeader>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero greeting */}
        <Card mode="contained" style={[styles.hero, { backgroundColor: theme.colors.primaryContainer }]}>
          <Card.Content>
            <Text variant="headlineSmall" style={{ color: theme.colors.onPrimaryContainer }}>
              {displayName ? `¡Hola, ${displayName}!` : "¡Hola! 👋"}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer, marginTop: 4, opacity: 0.85 }}>
              Learn Spanish through the music you love.
            </Text>
            <View style={styles.streakRow}>
              <View style={[styles.streakPill, { backgroundColor: theme.colors.streak }]}>
                <MaterialCommunityIcons name="fire" size={18} color={theme.colors.onStreak} />
                <Text variant="labelLarge" style={{ color: theme.colors.onStreak }}>
                  {streak ?? 0} day streak
                </Text>
              </View>
              <Button mode="contained-tonal" compact onPress={() => router.push("/practice")} icon="play">
                Practice
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Song carousel */}
        <View style={styles.sectionHeaderRow}>
          <Text variant="titleMedium" style={{ color: theme.colors.onBackground }}>
            Your songs
          </Text>
          <Button mode="text" compact onPress={() => router.push("/songs")}>
            See all
          </Button>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselContent}>
          {SONGS.map((song) => (
            <Pressable key={song.id} style={styles.songTile} onPress={() => router.push(`/song/${song.id}` as any)}>
              <Surface style={[styles.songCover, { backgroundColor: song.coverColor }]} elevation={1}>
                <MaterialCommunityIcons name="music" size={32} color="#3B2A1F" />
              </Surface>
              <Text variant="labelLarge" numberOfLines={1} style={[styles.songTileName, { color: theme.colors.onBackground }]}>
                {song.displayName ?? song.name}
              </Text>
              <Text variant="bodySmall" numberOfLines={1} style={[styles.songTileArtist, { color: theme.colors.onSurfaceVariant }]}>
                {song.displayName ? "—" : song.artist}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Explore categories */}
        <View style={styles.sectionHeaderRow}>
          <Text variant="titleMedium" style={{ color: theme.colors.onBackground }}>
            Explore
          </Text>
        </View>
        <View style={styles.grid}>
          {SECTIONS.map((section) => (
            <Pressable key={section.label} style={styles.gridItem} onPress={() => router.push(section.route as any)}>
              <Surface style={[styles.categoryCard, { backgroundColor: toneColor(section.tone) }]} elevation={0}>
                <MaterialCommunityIcons name={section.icon} size={28} color={onToneColor(section.tone)} />
                <Text variant="titleSmall" style={{ color: onToneColor(section.tone), marginTop: 12 }}>
                  {section.label}
                </Text>
              </Surface>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Login / Sign up modal */}
      <Portal>
        <Modal
          visible={modalMode !== null}
          onDismiss={() => setModalMode(null)}
          contentContainerStyle={[styles.modalBox, { backgroundColor: theme.colors.surface }]}
        >
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, marginBottom: 12 }}>
              {modalMode === "signup" ? "Sign up" : "Log in"}
            </Text>
            <TextInput
              mode="outlined"
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              style={styles.input}
            />
            {authError && (
              <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 8 }}>
                {authError}
              </Text>
            )}
            <Button mode="contained" onPress={handleSubmit} loading={isLoading} disabled={isLoading} style={styles.modalBtn}>
              {modalMode === "signup" ? "Sign up" : "Log in"}
            </Button>
            <Button mode="outlined" onPress={handleGoogleSubmit} disabled={isLoading} icon="google" style={styles.modalBtn}>
              {modalMode === "signup" ? "Sign up with Google" : "Log in with Google"}
            </Button>
            <Button mode="text" onPress={() => setModalMode(null)}>
              Cancel
            </Button>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>
    </AppScaffold>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 24 },
  hero: { marginHorizontal: 16, marginTop: 8, borderRadius: 24 },
  streakRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, gap: 12 },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 8,
  },
  carouselContent: { paddingHorizontal: 20, gap: 16 },
  songTile: { width: 116, alignItems: "center" },
  songCover: {
    width: 108,
    height: 108,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  songTileName: { textAlign: "center", width: 108 },
  songTileArtist: { textAlign: "center", width: 108, marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 16 },
  gridItem: { width: "47%" },
  categoryCard: {
    borderRadius: 24,
    paddingVertical: 26,
    paddingHorizontal: 18,
    alignItems: "flex-start",
  },
  modalBox: { marginHorizontal: 24, borderRadius: 28, padding: 24 },
  input: { marginBottom: 12 },
  modalBtn: { marginBottom: 10 },
});
