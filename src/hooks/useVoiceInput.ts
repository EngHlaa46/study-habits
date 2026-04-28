"use client";

import { useState, useRef, useCallback } from "react";

export function useVoiceInput({
  getBase,
  onResult,
  lang = "en",
}: {
  getBase: () => string;
  onResult: (value: string) => void;
  lang?: "en" | "ar";
}) {
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const baseRef = useRef("");
  const liveTranscribingRef = useRef(false);

  // Keep refs current so the memoized toggle always calls the latest versions
  const getBaseRef = useRef(getBase);
  getBaseRef.current = getBase;
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const toggle = useCallback(async () => {
    if (listening) {
      mediaRecorderRef.current?.stop();
      setListening(false);
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return;
    }

    audioChunksRef.current = [];
    baseRef.current = getBaseRef.current();
    liveTranscribingRef.current = false;

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : MediaRecorder.isTypeSupported("audio/mp4")
      ? "audio/mp4"
      : "";
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    mediaRecorderRef.current = recorder;
    const recordedMime = recorder.mimeType || mimeType || "audio/webm";
    const fileExt = recordedMime.includes("mp4") ? "mp4" : "webm";

    const applyTranscript = (transcript: string) => {
      const base = baseRef.current;
      onResultRef.current(base.trimEnd() ? base.trimEnd() + " " + transcript : transcript);
    };

    const transcribeAccumulated = async () => {
      if (liveTranscribingRef.current || audioChunksRef.current.length === 0) return;
      liveTranscribingRef.current = true;
      const blob = new Blob(audioChunksRef.current, { type: recordedMime });
      try {
        const fd = new FormData();
        fd.append("audio", blob, `recording.${fileExt}`);
        fd.append("lang", lang === "ar" ? "ar" : "en");
        const res = await fetch("/api/chat/transcribe", { method: "POST", body: fd });
        if (!res.ok) { console.error("[voice] transcribe error", res.status); return; }
        const { transcript } = await res.json();
        if (transcript) applyTranscript(transcript.trim());
      } catch (err) { console.error("[voice] fetch error", err); } finally {
        liveTranscribingRef.current = false;
      }
    };

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunksRef.current.push(e.data);
        transcribeAccumulated();
      }
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setTranscribing(true);
      const blob = new Blob(audioChunksRef.current, { type: recordedMime });
      audioChunksRef.current = [];
      try {
        const fd = new FormData();
        fd.append("audio", blob, `recording.${fileExt}`);
        fd.append("lang", lang === "ar" ? "ar" : "en");
        const res = await fetch("/api/chat/transcribe", { method: "POST", body: fd });
        if (!res.ok) { console.error("[voice] onstop transcribe error", res.status, await res.text()); return; }
        const { transcript } = await res.json();
        if (transcript) applyTranscript(transcript.trim());
      } catch (err) { console.error("[voice] onstop fetch error", err); } finally {
        setTranscribing(false);
      }
    };

    recorder.start(2500);
    setListening(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening, lang]);

  return { listening, transcribing, toggle };
}
