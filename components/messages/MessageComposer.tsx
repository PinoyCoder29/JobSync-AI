"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { MESSAGE_MAX_LENGTH } from "@/lib/messaging/constants";

/**
 * Auto-growing message box. Desktop: Enter sends, Shift+Enter adds a line.
 * Touch devices: Enter adds a line (people expect that on a phone keyboard) and the Send button sends.
 */
export function MessageComposer({ onSend }: { onSend: (text: string) => void }) {
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
