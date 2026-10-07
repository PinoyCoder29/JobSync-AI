"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { MESSAGE_MAX_LENGTH } from "@/lib/messaging/constants";

/**
 * Auto-growing message box. Desktop: Enter sends, Shift+Enter adds a line.
 * Touch devices: Enter adds a line (people expect that on a phone keyboard) and the Send button sends.
 */
export function MessageComposer({ onSend, replyingTo, onCancelReply }: { onSend: (text: string) => void; replyingTo?: { name: string; text: string } | null; onCancelReply?: () => void }) {
  const inputId = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");
  const trimmed = value.trim();
  const tooLong = value.length > MESSAGE_MAX_LENGTH;
  const nearLimit = value.length > MESSAGE_MAX_LENGTH - 200;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [value]);

  function submit() {
    if (!trimmed || tooLong) return;
    onSend(trimmed);
    setValue("");
    ref.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    e.preventDefault();
    submit();
  }

  return (
    <div className="chat-composer">
      {replyingTo && (
        <div className="chat-replybar">
          <i className="bi bi-reply-fill" aria-hidden="true" />
          <span className="min-w-0"><strong className="d-block small">Replying to {replyingTo.name}</strong><span className="d-block small text-muted text-truncate">{replyingTo.text}</span></span>
          <button type="button" className="icon-btn ms-auto" aria-label="Cancel reply" onClick={onCancelReply}><i className="bi bi-x-lg" aria-hidden="true" /></button>
        </div>
      )}
      {nearLimit && <p className={`chat-count small mb-1 ${tooLong ? "text-danger" : "text-muted"}`} role="status">{value.length}/{MESSAGE_MAX_LENGTH}</p>}
      <div className="chat-composer-row">
        <label htmlFor={inputId} className="visually-hidden">Message</label>
        <textarea
          id={inputId}
          ref={ref}
          className="form-control"
          rows={1}
          value={value}
          placeholder="Type a message..."
          enterKeyHint="send"
          autoComplete="off"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button type="button" className="btn btn-brand chat-send" onClick={submit} disabled={!trimmed || tooLong} aria-label="Send message">
          <i className="bi bi-send-fill" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
