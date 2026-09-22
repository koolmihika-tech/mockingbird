import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
} from "expo-audio";
import { useCallback, useEffect, useState } from "react";
import type { VoiceRecorder } from "./useVoiceRecorder.types";

/** TEMPORARY bisection stub (round 2) — expo-audio restored, expo-file-system
 *  still disabled (getRecordingBase64 is a no-op) to isolate which of the two
 *  causes the TestFlight launch hang. Revert to the full implementation once
 *  confirmed. */
export function useVoiceRecorder(): VoiceRecorder {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player = useAudioPlayer(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clear = useCallback(() => setRecordingUri(null), []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
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
  }, [recorder]);

  const stop = useCallback(async () => {
    try {
      await recorder.stop();
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

  // expo-file-system disabled for this bisection round — uploads are stubbed.
  const getRecordingBase64 = useCallback(async () => null, []);

  useEffect(() => {
    return () => {
      if (isRecording) void recorder.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isRecording, recordingUri, error, supported: true, toggle, clear, play, getRecordingBase64 };
}
