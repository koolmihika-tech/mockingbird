import { setAudioModeAsync } from "expo-audio";
import * as Speech from "expo-speech";
import { useCallback, useEffect, useRef, useState } from "react";

/** Languages to look for, in order: Mexican Spanish first, then other Latin
 *  American voices (Chrome on web often only ships es-US). Matches the
 *  es-419 target the pronunciation scorer uses. */
const PREFERRED_LANGUAGES = ["es-MX", "es-US", "es-419"];

/** Slow-mode speech rate (1.0 is normal). */
const SLOW_RATE = 0.7;

async function findVoice(): Promise<string | undefined> {
  const voices = await Speech.getAvailableVoicesAsync();
  // Android reports e.g. "es_MX"; iOS/web use "es-MX".
  const norm = (lang: string) => lang.replace("_", "-").toLowerCase();
  for (const lang of PREFERRED_LANGUAGES) {
    const matches = voices.filter((v) => norm(v.language) === lang.toLowerCase());
    const best = matches.find((v) => v.quality === Speech.VoiceQuality.Enhanced) ?? matches[0];
    if (best) return best.identifier;
  }
  return undefined;
}

/** Reads a lyric line aloud with the device's Spanish (Mexico) text-to-speech
 *  voice — Siri voices on iOS, the system TTS engine on Android, and
 *  speechSynthesis on web. */
export function useSpeakLine() {
  const [voice, setVoice] = useState<string | undefined>();
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<string | undefined>(undefined);

  const loadVoice = useCallback(async () => {
    try {
      const found = await findVoice();
      voiceRef.current = found;
      setVoice(found);
    } catch {
      // Leave voice unset — speak() still passes language "es-MX".
    } finally {
      setVoicesLoaded(true);
    }
  }, []);

  useEffect(() => {
    void loadVoice();
    return () => void Speech.stop();
  }, [loadVoice]);

  const stop = useCallback(() => {
    void Speech.stop();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string, slow = false) => {
      await Speech.stop();
      // Web browsers load their voice list lazily, so it can be empty on mount.
      if (!voiceRef.current) await loadVoice();
      try {
        // iOS: without this, speech is silent when the ringer switch is off.
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      } catch {
        // Not supported on this platform — fine.
      }
      Speech.speak(text, {
        language: "es-MX",
        voice: voiceRef.current,
        rate: slow ? SLOW_RATE : 1.0,
        onStart: () => setSpeaking(true),
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
      // onStart doesn't fire on every platform; flip state right away too.
      setSpeaking(true);
    },
    [loadVoice],
  );

  return { speak, stop, speaking, hasVoice: !!voice, voicesLoaded };
}
