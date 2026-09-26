import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
} from "expo-audio";
import type { PermissionResponse } from "expo-audio";
import { File } from "expo-file-system";
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import type { MicPermission, VoiceRecorder } from "./useVoiceRecorder.types";

const toMicPermission = (res: PermissionResponse): MicPermission =>
  res.granted ? "granted" : res.status === "undetermined" ? "undetermined" : res.canAskAgain ? "denied" : "blocked";

/** Native recorder backed by expo-audio. Produces a file:// .m4a URI. */
export function useVoiceRecorder(): VoiceRecorder {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player = useAudioPlayer(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<MicPermission>("undetermined");

  // Read the current permission on mount, and again whenever the app comes
  // back to the foreground (the user may have just changed it in Settings).
  useEffect(() => {
    const refresh = () =>
      AudioModule.getRecordingPermissionsAsync()
        .then((res) => setPermission(toMicPermission(res)))
        .catch(() => {});
    refresh();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => sub.remove();
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      const res = await AudioModule.requestRecordingPermissionsAsync();
      setPermission(toMicPermission(res));
      return res.granted;
    } catch {
      return false;
    }
  }, []);

  const clear = useCallback(() => setRecordingUri(null), []);

  const start = useCallback(async () => {
    setError(null);
    try {
      if (!(await requestPermission())) {
        setError("Microphone access was denied.");
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      setRecordingUri(null);
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
    } catch {
      setError("Could not start recording.");
      setIsRecording(false);
    }
  }, [recorder, requestPermission]);

  const stop = useCallback(async () => {
    try {
      await recorder.stop();
      // Switch the session back to playback so the clip isn't routed to the
      // earpiece / silenced on iOS.
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      setRecordingUri(recorder.uri ?? null);
    } catch {
      setError("Could not save recording.");
    } finally {
      setIsRecording(false);
    }
  }, [recorder]);

  const toggle = useCallback(() => {
    if (isRecording) void stop();
    else void start();
  }, [isRecording, start, stop]);

  const play = useCallback(() => {
    if (!recordingUri) return;
    player.replace(recordingUri);
    player.seekTo(0);
    player.play();
  }, [player, recordingUri]);

  const getRecordingBase64 = useCallback(async () => {
    if (!recordingUri) return null;
    const base64 = await new File(recordingUri).base64();
    // RecordingPresets.HIGH_QUALITY records .m4a on both iOS and Android.
    return { base64, mime: "audio/m4a" };
  }, [recordingUri]);

  useEffect(() => {
    return () => {
      if (isRecording) void recorder.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isRecording, recordingUri, error, supported: true, permission, requestPermission, toggle, clear, play, getRecordingBase64 };
}
