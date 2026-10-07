"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { postJson } from "@/lib/client/api";
import type { AssistantReplyDTO } from "@/services/assistant/assistant.service";

type Turn = { role: "user" | "assistant"; text: string; tool?: AssistantReplyDTO["tool"]; followUps?: string[]; source?: AssistantReplyDTO["source"]; error?: boolean };

export const QUICK_ASKS = [
  "What jobs should I apply for?",
  "How can I improve my resume?",
  "What skills should I learn?",
  "Help me prepare for a React interview.",
];

/** Ask-the-AI box. The question goes to our server (which holds the API key and builds a small, relevant context). */
export function AssistantChat({ seed }: { seed?: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [turns, busy]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const history = turns.filter((t) => !t.error).slice(-8).map((t) => ({ role: t.role, text: t.text.slice(0, 4000) }));
    setTurns((p) => [...p, { role: "user", text: q }]);
    setText("");
    setBusy(true);
    try {
      const { data } = await postJson<AssistantReplyDTO>("/api/assistant/chat", { message: q, history });
      setTurns((p) => [...p, { role: "assistant", text: data.reply, tool: data.tool, followUps: data.followUps, source: data.source }]);
    } catch (e) {
      setTurns((p) => [...p, { role: "assistant", text: e instanceof Error ? e.message : "Something went wrong.", error: true }]);
    } finally {
      setBusy(false);
      input.current?.focus();
    }
  }

  // Quick actions elsewhere on the page can pre-ask a question.
  useEffect(() => {
    const onAsk = (e: Event) => void ask((e as CustomEvent<string>).detail);
    window.addEventListener("assistant:ask", onAsk);
    return () => window.removeEventListener("assistant:ask", onAsk);
  });
  useEffect(() => { if (seed) void ask(seed); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const last = turns[turns.length - 1];

  return (
    <div className="ai-chat">
      {turns.length === 0 ? (
        <div className="ai-chat-empty">
          <p className="ai-chat-lead">Ask me anything about your career.</p>
          <div className="ai-prompts">{QUICK_ASKS.map((q) => <button key={q} type="button" className="ai-prompt" onClick={() => ask(q)}>&ldquo;{q}&rdquo;</button>)}</div>
        </div>
      ) : (
        <div className="ai-thread" role="log" aria-live="polite" aria-label="Conversation with Career AI">
          {turns.map((t, i) => (
            <div key={i} className={`ai-turn ${t.role}`}>
              <div className={`ai-bubble ${t.error ? "error" : ""}`}>{t.text}</div>
              {t.tool && <Link href={t.tool.href} className="btn btn-outline-brand btn-sm mt-2">{t.tool.label} <i className="bi bi-arrow-right" aria-hidden="true" /></Link>}
              {t.source === "guide" && i === turns.length - 1 && <p className="small text-muted mt-1 mb-0">Basic guidance (AI isn&apos;t configured on this server).</p>}
            </div>
          ))}
          {busy && <div className="ai-turn assistant"><div className="ai-bubble typing" aria-label="Career AI is thinking"><span /><span /><span /></div></div>}
          {!busy && last?.followUps && last.followUps.length > 0 && <div className="ai-prompts">{last.followUps.map((f) => <button key={f} type="button" className="ai-prompt" onClick={() => ask(f)}>{f}</button>)}</div>}
          <div ref={end} />
        </div>
      )}

      <form className="ai-input" onSubmit={(e) => { e.preventDefault(); void ask(text); }}>
        <label htmlFor="ai-q" className="visually-hidden">Ask Career AI</label>
        <textarea
          id="ai-q"
          ref={input}
          rows={1}
          className="form-control"
          placeholder="Ask Career AI…"
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !window.matchMedia("(pointer: coarse)").matches) { e.preventDefault(); void ask(text); } }}
        />
        <button type="submit" className="btn btn-brand ai-send" disabled={busy || !text.trim()} aria-label="Send"><i className="bi bi-send-fill" aria-hidden="true" /></button>
      </form>
    </div>
  );
}
