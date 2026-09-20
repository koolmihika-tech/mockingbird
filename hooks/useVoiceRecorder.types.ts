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
  /** Start if idle, stop if recording. */
  toggle: () => void;
  /** Discard the current recording. */
  clear: () => void;
  /** Play back the current recording. */
  play: () => void;
  /** Read the current recording as base64 for upload, or null if there is none. */
  getRecordingBase64: () => Promise<{ base64: string; mime: string } | null>;
}
