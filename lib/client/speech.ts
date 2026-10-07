"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Browser Web Speech API. No audio ever goes to OUR server: only the final text transcript does.
   (Chrome/Edge transcribe through the browser vendor's own speech service; Firefox has no recognition: typing is the fallback.) */

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
interface Recognition {
  continuous: boolean; interimResults: boolean; lang: string;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;
const getCtor = (): RecognitionCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
export const canListen = () => getCtor() !== null;

/** Reads text aloud. `speak()` resolves when finished (or immediately when unsupported / cancelled). */
export function useSpeaker() {
  const [speaking, setSpeaking] = useState(false);
  const token = useRef(0);

  const stop = useCallback(() => {
    token.current++;
    if (canSpeak()) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string) => new Promise<void>((resolve) => {
    if (!canSpeak() || !text.trim()) return resolve();
    window.speechSynthesis.cancel();
    const mine = ++token.current;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.98;
    const voices = window.speechSynthesis.getVoices();
    u.voice = voices.find((v) => v.lang.startsWith("en") && /natural|google|samantha|aria|jenny/i.test(v.name)) ?? voices.find((v) => v.lang.startsWith("en")) ?? null;
    const done = () => { if (token.current === mine) setSpeaking(false); resolve(); };
    u.onstart = () => setSpeaking(true);
    u.onend = done;
    u.onerror = done; // e.g. autoplay blocked: carry on silently, the text is on screen
    window.speechSynthesis.speak(u);
  }), []);

  useEffect(() => stop, [stop]);
  return { speaking, speak, stop };
}

const ERRORS: Record<string, string> = {
  "not-allowed": "Microphone access is blocked. Allow it in your browser's address bar, or type your answer.",
  "service-not-allowed": "Speech recognition isn't allowed in this browser. Type your answer instead.",
  "no-speech": "I didn't hear anything. Hold the button and try again.",
  "audio-capture": "No microphone was found. Type your answer instead.",
  network: "Speech recognition needs an internet connection. Type your answer instead.",
};

/** Hold-to-talk transcription. `text` = everything recognised so far (final + the current interim words). */
export function useListener() {
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const finalText = useRef("");

  const start = useCallback((base = "") => {
    const Ctor = getCtor();
    if (!Ctor || rec.current) return;
    setError(null);
    finalText.current = base ? `${base.trim()} ` : "";
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText.current += `${res[0].transcript.trim()} `;
        else interim += res[0].transcript;
      }
      setText((finalText.current + interim).trim());
    };
    r.onerror = (e) => { if (e.error !== "aborted") setError(ERRORS[e.error] ?? "Speech recognition failed. Type your answer instead."); };
    r.onend = () => { rec.current = null; setListening(false); setText(finalText.current.trim()); };
    rec.current = r;
    try { r.start(); setListening(true); } catch { rec.current = null; setListening(false); }
  }, []);

  const stop = useCallback(() => rec.current?.stop(), []);
  useEffect(() => () => rec.current?.abort(), []);
  return { listening, text, setText, error, setError, start, stop };
}
