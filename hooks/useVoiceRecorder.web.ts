import { useCallback, useEffect, useRef, useState } from "react";
import type { MicPermission, VoiceRecorder } from "./useVoiceRecorder.types";

/** Web recorder backed by the MediaRecorder API. */
export function useVoiceRecorder(): VoiceRecorder {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<MicPermission>("undetermined");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const supported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  // Browsers that support the Permissions API tell us up front whether the
  // mic is already allowed or blocked. A browser won't re-prompt after a
  // denial, so "denied" there maps to "blocked".
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;
    let status: PermissionStatus | null = null;
    const apply = () => {
      if (!status) return;
      setPermission(status.state === "granted" ? "granted" : status.state === "denied" ? "blocked" : "undetermined");
    };
    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((s) => {
        status = s;
        apply();
        s.onchange = apply;
      })
      .catch(() => {});
    return () => {
      if (status) status.onchange = null;
    };
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const requestPermission = useCallback(async () => {
    if (!supported) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setPermission("granted");
      return true;
    } catch {
      setPermission("blocked");
      return false;
    }
  }, [supported]);

  const clear = useCallback(() => {
    setRecordingUri((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const start = useCallback(async () => {
    if (!supported) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermission("granted");
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setRecordingUri((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
        stopStream();
        setIsRecording(false);
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      setError("Microphone access was denied.");
      setPermission("blocked");
      stopStream();
      setIsRecording(false);
    }
  }, [supported, stopStream]);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
  }, []);

  const toggle = useCallback(() => {
    if (isRecording) stop();
    else void start();
  }, [isRecording, start, stop]);

  const play = useCallback(() => {
    if (recordingUri) void new Audio(recordingUri).play();
  }, [recordingUri]);

  const getRecordingBase64 = useCallback(async () => {
    if (!recordingUri) return null;
    const blob = await fetch(recordingUri).then((r) => r.blob());
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return { base64, mime: blob.type || "audio/webm" };
  }, [recordingUri]);

  useEffect(() => {
    return () => {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      stopStream();
      setRecordingUri((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [stopStream]);

  return { isRecording, recordingUri, error, supported, permission, requestPermission, toggle, clear, play, getRecordingBase64 };
}
