import { useCallback, useState } from "react";
import type { VoiceRecorder } from "./useVoiceRecorder.types";

/** TEMPORARY bisection stub — expo-audio / expo-file-system disabled to test
 *  whether they're causing the TestFlight launch hang. Revert this file (and
 *  the expo-audio plugin entry in app.json) once confirmed. */
export function useVoiceRecorder(): VoiceRecorder {
  const [error] = useState<string | null>(null);

  const noop = useCallback(() => {}, []);
  const noopAsync = useCallback(async () => null, []);

  return {
    isRecording: false,
    recordingUri: null,
    error,
    supported: false,
    toggle: noop,
    clear: noop,
    play: noop,
    getRecordingBase64: noopAsync,
  };
}
