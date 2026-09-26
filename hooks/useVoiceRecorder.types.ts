/** Microphone permission state. "blocked" means the OS/browser won't show its
 *  prompt again — the user has to re-enable access in Settings. */
export type MicPermission = "granted" | "undetermined" | "denied" | "blocked";

/** Shape returned by useVoiceRecorder — see useVoiceRecorder.ts (native,
 *  expo-audio) and useVoiceRecorder.web.ts (browser MediaRecorder). Metro picks
 *  the .web variant automatically when bundling for web. */
export interface VoiceRecorder {
  /** True while capture is in progress. */
  isRecording: boolean;
  /** URI of the last finished recording — blob: on web, file:// on native. */
  recordingUri: string | null;
  /** User-facing error message, or null. */
  error: string | null;
  /** False when the platform can't record (e.g. a browser without MediaRecorder). */
  supported: boolean;
  /** Current microphone permission. */
  permission: MicPermission;
  /** Show the system microphone prompt. Resolves true if access was granted. */
  requestPermission: () => Promise<boolean>;
  /** Start if idle, stop if recording. */
  toggle: () => void;
  /** Discard the current recording. */
  clear: () => void;
  /** Play back the current recording. */
  play: () => void;
  /** Read the current recording as base64 for upload, or null if there is none. */
  getRecordingBase64: () => Promise<{ base64: string; mime: string } | null>;
}
