"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { InterviewReport } from "./InterviewReport";
import { postJson } from "@/lib/client/api";
import { canListen, canSpeak, useListener, useSpeaker } from "@/lib/client/speech";
import { MAX_ANSWER_CHARS } from "@/lib/validations/live-interview";
import type { LiveStateDTO } from "@/services/interview/live-interview.service";

import { INTERVIEW_TYPES } from "@/lib/interview-types";

const retryKey = (focus: string) => (Object.entries(INTERVIEW_TYPES).find(([, v]) => v.focus === focus)?.[0]);

type Phase = "intro" | "speaking" | "ready" | "listening" | "thinking" | "done";

/**
 * The AI interviewer. Flow: AI speaks a question -> you hold the mic (or type) -> your TRANSCRIPT is sent to the server ->
 * the AI evaluates it and picks a follow-up or a new topic -> it speaks the next question ... -> final report.
 * Only text is sent to our server; audio stays in the browser.
 */
export function LiveInterview({ initial }: { initial: LiveStateDTO }) {
  const [state, setState] = useState(initial);
  const [phase, setPhase] = useState<Phase>(initial.status === "COMPLETED" ? "done" : "intro");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [ending, setEnding] = useState(false);
  const speaker = useSpeaker();
  const listener = useListener();
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const sttOk = canListen();
  const ttsOk = canSpeak();

  // the speech transcript flows into the editable answer box
  useEffect(() => { if (listener.text) setAnswer(listener.text); }, [listener.text]);
  useEffect(() => { if (listener.error) setError(listener.error); }, [listener.error]);
  useEffect(() => { if (!listener.listening && phase === "listening") setPhase("ready"); }, [listener.listening, phase]);

  const say = useCallback(async (text: string) => {
    if (muted || !ttsOk) { setPhase("ready"); return; }
    setPhase("speaking");
    await speaker.speak(text);
    setPhase((p) => (p === "speaking" ? "ready" : p));
  }, [muted, ttsOk, speaker]);

  // The first tap is needed because browsers only allow speech after a user gesture.
  async function begin() {
    let greeting = "";
    try { greeting = sessionStorage.getItem(`jobsync:greeting:${state.sessionId}`) ?? ""; sessionStorage.removeItem(`jobsync:greeting:${state.sessionId}`); } catch { /* ignore */ }
    await say(`${greeting} ${state.question?.text ?? ""}`.trim());
  }

  async function send() {
    const text = answer.trim();
    if (!text || !state.question || phase === "thinking") return;
    speaker.stop();
    listener.stop();
    setError(null);
    setPhase("thinking");
    try {
      const { data } = await postJson<{ acknowledgement: string; state: LiveStateDTO; done: boolean }>(`/api/interview/live/${state.sessionId}/answer`, { questionId: state.question.id, answer: text });
      setAnswer("");
      listener.setText("");
      setState(data.state);
      if (data.done) { setPhase("done"); void speaker.speak("Thank you, that's the end of the interview. Here are your results."); }
      else await say(`${data.acknowledgement} ${data.state.question?.text ?? ""}`.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please send your answer again.");
      setPhase("ready"); // the answer text is kept so nothing is lost
    }
  }

  async function end() {
    if (!window.confirm("End the interview now? You'll get a report for the questions you've answered.")) return;
    speaker.stop();
    listener.stop();
    setEnding(true);
    try {
      const { data } = await postJson<LiveStateDTO>(`/api/interview/live/${state.sessionId}/end`, {});
      setState(data);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't end the interview.");
    } finally {
      setEnding(false);
    }
  }

  // ───────── Hold to answer (pointer + keyboard) ─────────
  const holdStart = () => { if (phase !== "ready" || !sttOk) return; speaker.stop(); setError(null); setPhase("listening"); listener.start(answer); };
  const holdEnd = () => { if (phase === "listening") listener.stop(); };

  if (phase === "done") {
    return (
      <div className="live-card">
        {state.report ? <InterviewReport report={state.report} retryType={retryKey(state.focus)} /> : (
          <div className="text-center py-4"><h2 className="h5">Interview ended</h2><p className="text-muted">You didn&apos;t answer any questions, so there&apos;s no report.</p><Link href="/interview/live" className="btn btn-brand">Start another</Link></div>
        )}
        {state.transcript.length > 0 && (
          <details className="mt-4"><summary className="fw-semibold">Review your answers</summary>
            <ol className="live-log mt-2">{state.transcript.map((t, i) => <li key={i}><strong>{t.question}</strong><p className="mb-0 text-muted">{t.answer}</p></li>)}</ol>
          </details>
        )}
      </div>
    );
  }

  const statusLine = phase === "speaking" ? "🔊 Speaking…" : phase === "listening" ? "🎙️ Listening… release when you're done" : phase === "thinking" ? "⏳ The interviewer is thinking…" : null;

  return (
    <div className="live-card">
      <div className="live-top">
        <div>
          <h1 className="h5 mb-0">AI Interviewer</h1>
          <div className="small text-muted text-truncate">{state.focus} · {state.role}</div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="live-progress" aria-label={`Question ${state.index} of ${state.total}`}>{state.index}/{state.total}</span>
          {ttsOk && <button type="button" className="icon-btn" aria-pressed={muted} aria-label={muted ? "Unmute interviewer voice" : "Mute interviewer voice"} onClick={() => { speaker.stop(); setMuted((m) => !m); }}><i className={`bi ${muted ? "bi-volume-mute" : "bi-volume-up"}`} aria-hidden="true" /></button>}
        </div>
      </div>

      <div className="live-stage">
        <div className={`live-bot ${phase === "speaking" || speaker.speaking ? "speaking" : ""} ${phase === "thinking" ? "thinking" : ""}`} aria-hidden="true"><i className="bi bi-robot" /></div>
        {state.question?.isFollowUp && <span className="live-chip">Follow-up</span>}
        <p className="live-question" aria-live="polite">&ldquo;{state.question?.text}&rdquo;</p>
        <p className="live-status" role="status">{statusLine}</p>
      </div>

      {phase === "intro" ? (
        <div className="text-center">
          <button type="button" className="btn btn-brand btn-lg" onClick={begin}><i className="bi bi-play-fill me-1" aria-hidden="true" />{state.transcript.length ? "Resume interview" : "Begin interview"}</button>
          {state.isDemo && <p className="small text-muted mt-2 mb-0">Demo interviewer: no AI key is configured, so questions come from a built-in bank and scoring is heuristic.</p>}
        </div>
      ) : (
        <>
          <label htmlFor="live-answer" className="small fw-semibold mb-1">Your answer {sttOk ? "(transcript: you can edit it)" : ""}</label>
          <textarea
            id="live-answer"
            ref={answerRef}
            className="form-control live-answer"
            rows={3}
            maxLength={MAX_ANSWER_CHARS}
            value={answer}
            disabled={phase === "thinking"}
            placeholder={sttOk ? "Hold the microphone and speak, or type here…" : "Type your answer here…"}
            onChange={(e) => { setAnswer(e.target.value); listener.setText(e.target.value); }}
          />
          {error && <p role="alert" className="small text-danger mt-2 mb-0">{error}</p>}
          {!sttOk && <p className="small text-muted mt-2 mb-0">Voice answers aren&apos;t supported in this browser (try Chrome or Edge). You can type instead.</p>}

          <div className="live-controls">
            {sttOk && (
              <button
                type="button"
                className={`live-mic ${phase === "listening" ? "on" : ""}`}
                disabled={phase !== "ready" && phase !== "listening"}
                aria-label="Hold to answer"
                onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); holdStart(); }}
                onPointerUp={holdEnd}
                onPointerCancel={holdEnd}
                onContextMenu={(e) => e.preventDefault()}
                onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); holdStart(); } }}
                onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") holdEnd(); }}
              >
                <i className={`bi ${phase === "listening" ? "bi-mic-fill" : "bi-mic"}`} aria-hidden="true" />
                <span>{phase === "listening" ? "Listening…" : "Hold to Answer"}</span>
              </button>
            )}
            <button type="button" className="btn btn-brand live-send" disabled={!answer.trim() || phase === "thinking" || phase === "listening"} onClick={send}>
              {phase === "thinking" ? "Thinking…" : "Send answer"} <i className="bi bi-send-fill ms-1" aria-hidden="true" />
            </button>
          </div>
          <p className="small text-muted text-center mt-2 mb-0">{sttOk ? "Voice uses your browser's speech service. Only the text transcript is sent to JobSync AI." : ""}</p>
        </>
      )}

      <div className="live-bottom">
        {state.transcript.length > 0 && <button type="button" className="btn btn-link btn-sm" onClick={() => setShowLog((v) => !v)} aria-expanded={showLog}>{showLog ? "Hide" : "Show"} conversation</button>}
        <button type="button" className="btn btn-outline-danger btn-sm ms-auto" onClick={end} disabled={ending || phase === "thinking"}>{ending ? "Ending…" : "End Interview"}</button>
      </div>
      {showLog && <ol className="live-log">{state.transcript.map((t, i) => <li key={i}><strong>{t.question}</strong><p className="mb-0 text-muted">{t.answer}</p></li>)}</ol>}
    </div>
  );
}
