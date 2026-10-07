"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { REACTION_META, REACTION_ORDER } from "@/components/social/reactions";
import { clockTime, messageActions, type LocalMessage } from "@/lib/messaging/thread";
import { useDismissable } from "@/lib/client/useDismissable";
import { MESSAGE_MAX_LENGTH } from "@/lib/messaging/constants";
import type { ReactionType } from "@prisma/client";

export type MessageHandlers = {
  onReact: (m: LocalMessage, type: ReactionType | null) => void;
  onReply: (m: LocalMessage) => void;
  onCopy: (m: LocalMessage) => void;
  onEdit: (m: LocalMessage, text: string) => Promise<boolean>;
  onDelete: (m: LocalMessage) => void;
  onRetry: (m: LocalMessage) => void;
  onRemoveFailed: (m: LocalMessage) => void;
};

/** ⋯ menu. Rendered with position:fixed so the scrolling thread can never clip it; flips above the button near the bottom. */
function MessageMenu({ m, mine, h, onEdit }: { m: LocalMessage; mine: boolean; h: MessageHandlers; onEdit: () => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismissable(open, wrap, close);
  const a = messageActions(m);

  useLayoutEffect(() => {
    if (!open || !btn.current || !panel.current) return;
    const b = btn.current.getBoundingClientRect();
    const p = panel.current.getBoundingClientRect();
    const below = b.bottom + 4 + p.height <= window.innerHeight - 8;
    const top = below ? b.bottom + 4 : Math.max(8, b.top - 4 - p.height);
    const left = Math.min(Math.max(8, mine ? b.right - p.width : b.left), window.innerWidth - p.width - 8);
    setPos({ top, left });
  }, [open, mine]);

  // a fixed panel would drift away from its bubble when the thread scrolls, so close instead
  useLayoutEffect(() => {
    if (!open) return;
    const onScroll = () => setOpen(false);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll, true); window.removeEventListener("resize", onScroll); };
  }, [open]);

  if (!Object.values(a).some(Boolean)) return null;
  const pick = (fn: () => void) => () => { setOpen(false); fn(); };

  return (
    <div className="msg-menu" ref={wrap}>
      <button ref={btn} type="button" className="msg-action" aria-label="Message options" aria-haspopup="menu" aria-expanded={open} onClick={() => { setPos(null); setOpen((v) => !v); }}>
        <i className="bi bi-three-dots-vertical" aria-hidden="true" />
      </button>
      {open && (
        <div ref={panel} className="menu-panel msg-menu-panel" role="menu" style={{ position: "fixed", top: pos?.top ?? 0, left: pos?.left ?? 0, width: "max-content", maxWidth: "calc(100vw - 16px)", visibility: pos ? "visible" : "hidden" }}>
          {a.react && (
            <div className="msg-react-row" role="group" aria-label="React">
              {REACTION_ORDER.map((t) => {
                const on = m.reactions.some((r) => r.mine && r.type === t);
                return <button key={t} type="button" role="menuitem" className={`reaction-opt ${on ? "on" : ""}`} aria-label={REACTION_META[t].label} title={REACTION_META[t].label} onClick={pick(() => h.onReact(m, on ? null : t))}>{REACTION_META[t].emoji}</button>;
              })}
            </div>
          )}
          {a.reply && <button type="button" role="menuitem" className="dropdown-item" onClick={pick(() => h.onReply(m))}><i className="bi bi-reply me-2" aria-hidden="true" />Reply</button>}
          {a.copy && <button type="button" role="menuitem" className="dropdown-item" onClick={pick(() => h.onCopy(m))}><i className="bi bi-clipboard me-2" aria-hidden="true" />Copy</button>}
          {a.edit && <button type="button" role="menuitem" className="dropdown-item" onClick={pick(onEdit)}><i className="bi bi-pencil me-2" aria-hidden="true" />Edit</button>}
          {(a.deleteForMe || a.deleteForEveryone) && <button type="button" role="menuitem" className="dropdown-item text-danger" onClick={pick(() => h.onDelete(m))}><i className="bi bi-trash3 me-2" aria-hidden="true" />Delete…</button>}
        </div>
      )}
    </div>
  );
}

export function MessageItem({ m, first, last, showSeen, h }: { m: LocalMessage; first: boolean; last: boolean; showSeen: boolean; h: MessageHandlers }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.content);
  const [saving, setSaving] = useState(false);
  const stateClass = m.deleted ? "deleted" : m.status ?? "";

  async function save() {
    if (!draft.trim() || draft.trim() === m.content || saving) { if (draft.trim() === m.content) setEditing(false); return; }
    setSaving(true);
    const okay = await h.onEdit(m, draft.trim());
    setSaving(false);
    if (okay) setEditing(false);
  }

  const menu = <MessageMenu m={m} mine={m.mine} h={h} onEdit={() => { setDraft(m.content); setEditing(true); }} />;

  return (
    <li className={`msg ${m.mine ? "mine" : "theirs"} ${first ? "first" : ""} ${last ? "last" : ""}`}>
      {editing ? (
        <div className="msg-edit">
          <label className="visually-hidden" htmlFor={`me-${m.id}`}>Edit message</label>
          <textarea
            id={`me-${m.id}`}
            className="form-control"
            rows={2}
            autoFocus
            maxLength={MESSAGE_MAX_LENGTH}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditing(false);
              else if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !window.matchMedia("(pointer: coarse)").matches) { e.preventDefault(); void save(); }
            }}
          />
          <div className="d-flex gap-2 mt-1 justify-content-end">
            <button type="button" className="btn btn-link btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            <button type="button" className="btn btn-brand btn-sm" disabled={saving || !draft.trim()} onClick={save}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </div>
      ) : (
        <div className="msg-row">
          {m.mine && menu}
          <div className="msg-stack">
            {m.replyTo && (
              <div className="msg-quote" aria-label="Replying to">
                <i className="bi bi-reply-fill me-1" aria-hidden="true" />
                <span className="text-truncate">{m.replyTo.deleted ? "Deleted message" : m.replyTo.preview}</span>
              </div>
            )}
            <div className={`msg-bubble ${stateClass}`}>{m.deleted ? "This message was deleted" : m.content}</div>
          </div>
          {!m.mine && menu}
        </div>
      )}

      {m.reactions.length > 0 && (
        <div className="msg-reactions" role="group" aria-label="Reactions">
          {m.reactions.map((r) => (
            <button key={r.type} type="button" className={`msg-chip ${r.mine ? "on" : ""}`} aria-pressed={r.mine} aria-label={`${REACTION_META[r.type].label}, ${r.count}${r.mine ? ", yours" : ""}`} onClick={() => h.onReact(m, r.mine ? null : r.type)}>
              <span aria-hidden="true">{REACTION_META[r.type].emoji}</span>{r.count > 1 && <span className="ms-1">{r.count}</span>}
            </button>
          ))}
        </div>
      )}

      {m.status === "failed" ? (
        <div className="msg-meta text-danger" role="alert">
          Not sent. {m.error && <span>{m.error} </span>}
          <button type="button" className="link-btn" onClick={() => h.onRetry(m)}>Retry</button>{" · "}
          <button type="button" className="link-btn" onClick={() => h.onRemoveFailed(m)}>Remove</button>
        </div>
      ) : m.status === "sending" ? (
        <div className="msg-meta">Sending…</div>
      ) : last || showSeen ? (
        <div className="msg-meta">
          <time dateTime={m.createdAt} suppressHydrationWarning>{clockTime(m.createdAt)}</time>
          {m.editedAt && <span> · Edited</span>}
          {showSeen && m.readAt && <span> · Seen</span>}
        </div>
      ) : m.editedAt ? <div className="msg-meta">Edited</div> : null}
    </li>
  );
}
