import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Modal, Portal, Surface, Text } from "react-native-paper";
import { getLyrics, parseSyncedLyrics } from "../../../api/lrclib";
import { AppScaffold } from "../../../components/AppScaffold";
import { useAppTheme, type AppTheme } from "../../../constants/theme";
import { SONGS } from "../../../data/songs";
import { useVoiceRecorder } from "../../../hooks/useVoiceRecorder";
import { transcribeIpa } from "../../../Supabase/services/transcription";

/** Per-song speaking practice — pick a random lyric line, record yourself
 *  saying it, and play the recording back. Set up like the per-song
 *  flashcards screen (app/songs/[id]/flashcards.tsx).
 *
 *  Recording goes through useVoiceRecorder, which uses the browser
 *  MediaRecorder API on web and expo-audio on a phone. */
export default function SongSpeakingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const song = SONGS.find((s) => s.id === id);

  const [lines, setLines] = useState<string[] | null>(null);
  const [lyric, setLyric] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    isRecording,
    recordingUri,
    error: recordError,
    supported,
    permission,
    requestPermission,
    toggle,
    clear,
    play,
    getRecordingBase64,
  } = useVoiceRecorder();

  // IPA transcription of the current recording (what was actually said).
  const [transcribing, setTranscribing] = useState(false);
  const [spokenIpa, setSpokenIpa] = useState<string | null>(null);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  // A new (or discarded) recording invalidates the previous transcription.
  useEffect(() => {
    setSpokenIpa(null);
    setTranscribeError(null);
  }, [recordingUri]);

  const checkAccuracy = useCallback(async () => {
    setTranscribing(true);
    setTranscribeError(null);
    setSpokenIpa(null);
    try {
      const audio = await getRecordingBase64();
      if (!audio) throw new Error("No recording to check.");
      setSpokenIpa(await transcribeIpa(audio.base64, audio.mime));
    } catch (e: any) {
      setTranscribeError(e?.message ?? "Could not transcribe recording.");
    } finally {
      setTranscribing(false);
    }
  }, [getRecordingBase64]);

  // In-app explainer shown before the system mic prompt (or, if access was
  // turned off, pointing the user to Settings).
  const [permissionPromptOpen, setPermissionPromptOpen] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);

  const onMicPress = useCallback(() => {
    if (isRecording || permission === "granted") toggle();
    else setPermissionPromptOpen(true);
  }, [isRecording, permission, toggle]);

  const allowMicrophone = useCallback(async () => {
    setRequestingPermission(true);
    const granted = await requestPermission();
    setRequestingPermission(false);
    if (granted) {
      setPermissionPromptOpen(false);
      toggle();
    }
  }, [requestPermission, toggle]);

  const pickRandomLine = useCallback((pool: string[]) => {
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }, []);

  useEffect(() => {
    if (!song) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setLines(null);
    setLyric(null);

    getLyrics(song.name, song.artist)
      .then((result) => {
        if (cancelled) return;
        const raw = result?.syncedLyrics
          ? parseSyncedLyrics(result.syncedLyrics).map((l) => l.text)
          : (result?.plainLyrics ?? "").split("\n");
        const pool = raw.map((l) => l.trim()).filter((l) => l.length > 0);
        if (pool.length === 0) {
          setError("No lyrics available for this song yet.");
          return;
        }
        setLines(pool);
        setLyric(pickRandomLine(pool));
      })
      .catch(() => {
        if (!cancelled) setError("Could not load lyrics.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [song?.id, pickRandomLine]);

  if (!song) {
    return (
      <AppScaffold title="Speaking" back>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, padding: 24 }}>
          Song not found.
        </Text>
      </AppScaffold>
    );
  }

  return (
    <AppScaffold title={`${song.displayName ?? song.name} — Speaking`} back>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="headlineSmall" style={styles.songName}>
          {song.displayName ?? song.name}
        </Text>
        {!song.displayName && (
          <Text variant="bodyMedium" style={styles.songArtist}>
            {song.artist}
          </Text>
        )}

        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 32 }} />
        ) : error ? (
          <Text variant="bodyMedium" style={styles.errorText}>
            {error}
          </Text>
        ) : (
          <>
            <View style={styles.lyricSection}>
              <View style={styles.lyricHeaderRow}>
                <Text variant="titleMedium" style={styles.sectionHeader}>
                  Your line
                </Text>
                <Pressable
                  onPress={() => {
                    if (lines) setLyric(pickRandomLine(lines));
                    clear();
                  }}
                  disabled={isRecording}
                  style={({ pressed }) => [styles.shuffleBtn, (pressed || isRecording) && { opacity: 0.6 }]}
                  hitSlop={8}
                >
                  <MaterialCommunityIcons name="shuffle-variant" size={18} color={theme.colors.onSurfaceVariant} />
                </Pressable>
              </View>
              <Text variant="headlineSmall" style={styles.lyricText}>
                {lyric}
              </Text>
            </View>

            {/* Record box */}
            <Surface style={styles.recordBox} elevation={1}>
              <Pressable
                onPress={onMicPress}
                disabled={!supported || transcribing}
                style={({ pressed }) => [
                  styles.micButton,
                  isRecording && styles.micButtonActive,
                  !supported && styles.micButtonDisabled,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <MaterialCommunityIcons
                  name={isRecording ? "stop" : "microphone"}
                  size={32}
                  color={isRecording ? theme.colors.onError : theme.colors.onPrimary}
                />
              </Pressable>
              <Text variant="labelLarge" style={styles.micLabel}>
                {!supported
                  ? "Recording not supported here"
                  : isRecording
                  ? "Recording… tap to stop"
                  : recordingUri
                  ? "Tap to record again"
                  : "Record voice"}
              </Text>
              {recordError && (
                <Text variant="bodySmall" style={styles.recordError}>
                  {recordError}
                </Text>
              )}
              {recordingUri && !isRecording && (
                <View style={styles.recordActions}>
                  <Pressable
                    onPress={play}
                    style={({ pressed }) => [styles.recordAction, pressed && { opacity: 0.7 }]}
                    hitSlop={6}
                  >
                    <MaterialCommunityIcons name="play-circle" size={18} color={theme.colors.primary} />
                    <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
                      Play back
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={checkAccuracy}
                    disabled={transcribing}
                    style={({ pressed }) => [
                      styles.recordAction,
                      pressed && { opacity: 0.7 },
                      transcribing && { opacity: 0.4 },
                    ]}
                    hitSlop={6}
                  >
                    <MaterialCommunityIcons name="waveform" size={18} color={theme.colors.primary} />
                    <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
                      Check accuracy
                    </Text>
                  </Pressable>
                </View>
              )}
            </Surface>

            {/* Accuracy box */}
            <Surface style={styles.accuracyBox} elevation={1}>
              <Text variant="titleMedium" style={styles.sectionHeader}>
                Accuracy
              </Text>
              {transcribing ? (
                <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 20 }} />
              ) : transcribeError ? (
                <Text variant="bodyMedium" style={styles.recordError}>
                  {transcribeError}
                </Text>
              ) : spokenIpa !== null ? (
                <>
                  <Text variant="labelMedium" style={styles.ipaLabel}>
                    What we heard (IPA)
                  </Text>
                  <Text variant="titleLarge" style={styles.ipaText} selectable>
                    {spokenIpa ? `/${spokenIpa}/` : "No speech detected — try recording again."}
                  </Text>
                </>
              ) : (
                <Text variant="bodySmall" style={styles.accuracyHint}>
                  {recordingUri
                    ? "Tap “Check accuracy” to score your recording."
                    : "Record the line above to see how close your pronunciation is."}
                </Text>
              )}
            </Surface>
          </>
        )}
      </ScrollView>

      {/* Microphone permission prompt */}
      <Portal>
        <Modal
          visible={permissionPromptOpen}
          onDismiss={() => setPermissionPromptOpen(false)}
          contentContainerStyle={[styles.modalBox, { backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.modalIcon}>
            <MaterialCommunityIcons name="microphone" size={28} color={theme.colors.onPrimary} />
          </View>
          <Text variant="headlineSmall" style={styles.modalTitle}>
            {permission === "blocked" ? "Microphone is turned off" : "Allow microphone access"}
          </Text>
          <Text variant="bodyMedium" style={styles.modalBody}>
            {permission === "blocked"
              ? Platform.OS === "web"
                ? "Mockingbird can't use your microphone. Allow microphone access for this site in your browser's settings, then try again."
                : "Mockingbird can't use your microphone. Turn on microphone access for Mockingbird in Settings to record yourself."
              : "Mockingbird uses your microphone to record you saying lyric lines so you can play them back. Recordings stay on your device."}
          </Text>
          {permission === "blocked" ? (
            Platform.OS !== "web" && (
              <Button
                mode="contained"
                onPress={() => {
                  setPermissionPromptOpen(false);
                  void Linking.openSettings();
                }}
                style={styles.modalBtn}
              >
                Open Settings
              </Button>
            )
          ) : (
            <Button
              mode="contained"
              onPress={allowMicrophone}
              loading={requestingPermission}
              disabled={requestingPermission}
              style={styles.modalBtn}
            >
              Allow microphone
            </Button>
          )}
          <Button mode="text" onPress={() => setPermissionPromptOpen(false)}>
            {permission === "blocked" && Platform.OS === "web" ? "OK" : "Not now"}
          </Button>
        </Modal>
      </Portal>
    </AppScaffold>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { padding: 24, paddingBottom: 48, alignItems: "center" },
    songName: { color: theme.colors.onBackground, fontWeight: "800", textAlign: "center", marginTop: 8, marginBottom: 4 },
    songArtist: { color: theme.colors.onSurfaceVariant, textAlign: "center", marginBottom: 20 },

    lyricSection: { width: "100%", marginTop: 12, marginBottom: 24 },
    lyricHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    sectionHeader: { color: theme.colors.onBackground, fontWeight: "700" },
    shuffleBtn: { padding: 4 },
    lyricText: { color: theme.colors.onSurface, fontWeight: "800", lineHeight: 32 },

    recordBox: {
      width: "100%",
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      paddingVertical: 28,
      paddingHorizontal: 16,
      alignItems: "center",
      gap: 14,
      marginBottom: 20,
    },
    micButton: {
      width: 72,
      height: 72,
      borderRadius: 999,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    micButtonActive: { backgroundColor: theme.colors.error },
    micButtonDisabled: { backgroundColor: theme.colors.surfaceVariant },
    micLabel: { color: theme.colors.onSurfaceVariant, fontWeight: "600" },
    recordError: { color: theme.colors.error, textAlign: "center", marginTop: 8 },
    recordActions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 18 },
    recordAction: { flexDirection: "row", alignItems: "center", gap: 6 },

    accuracyBox: {
      width: "100%",
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      minHeight: 120,
    },
    accuracyHint: { color: theme.colors.onSurfaceVariant, marginTop: 10 },
    ipaLabel: { color: theme.colors.onSurfaceVariant, marginTop: 12, marginBottom: 4 },
    ipaText: { color: theme.colors.onSurface, lineHeight: 30 },

    modalBox: { marginHorizontal: 24, borderRadius: 28, padding: 24, alignItems: "stretch" },
    modalIcon: {
      width: 56,
      height: 56,
      borderRadius: 999,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      marginBottom: 16,
    },
    modalTitle: { color: theme.colors.onSurface, fontWeight: "700", textAlign: "center", marginBottom: 8 },
    modalBody: { color: theme.colors.onSurfaceVariant, textAlign: "center", marginBottom: 20 },
    modalBtn: { marginBottom: 10 },

    errorText: { color: theme.colors.error, textAlign: "center", marginTop: 32 },
  });
