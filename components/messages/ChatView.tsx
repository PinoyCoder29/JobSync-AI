"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactionType } from "@prisma/client";
import { useUnreadCounts } from "@/components/layout/UnreadCounts";
import { Avatar } from "@/components/ui/Avatar";
import { api, del, postJson } from "@/lib/client/api";
import { useDismissable } from "@/lib/client/useDismissable";
import { applyMyReaction, buildThread, mergeMessages, type LocalMessage } from "@/lib/messaging/thread";
import { presenceLabel, type PresenceDTO } from "@/lib/presence";
import type { ConversationDetailDTO, MessageDTO, MessagePageDTO, UnreadCountsDTO } from "@/services/messaging/types";
import { MessageComposer } from "./MessageComposer";
import { MessageItem, type MessageHandlers } from "./MessageItem";
import { useMessenger } from "./MessagesShell";

const POLL_MS = 4000;
const NEAR_BOTTOM_PX = 120;
const RETRY_READ_MS = 5000;

const newClientId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;

const errorText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

/**
 * One open conversation.
 *  - history comes from the database (server-rendered first page, older pages on demand) and survives refreshes,
 *  - sending is optimistic: the bubble appears at once, is saved server-side, and can be retried safely (idempotent clientId),
 *  - new messages arrive by polling (every 4s while the tab is visible), there are no WebSockets in this stack,
 *  - opening the chat marks the other person's messages read and clears the matching notification.
 */
export function ChatView({ conversation, initial }: { conversation: ConversationDetailDTO; initial: MessagePageDTO }) {
  const { refresh: refreshInbox } = useMessenger();
  const { update: updateCounts } = useUnreadCounts();
  const id = conversation.id;
  const { person } = conversation;

  const [messages, setMessages] = useState<LocalMessage[]>(initial.items);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [readTick, setReadTick] = useState(0);
  const [replyTo, setReplyTo] = useState<LocalMessage | null>(null);
  const [deleting, setDeleting] = useState<LocalMessage | null>(null);
  const [presence, setPresence] = useState<PresenceDTO>(person.presence);
  const [clock, setClock] = useState(() => Date.now());

  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const heightBeforePrepend = useRef<number | null>(null);
  const readInFlight = useRef(false);

  // ───────── Scrolling: stay at the bottom for new messages, but never yank the reader away from older ones ─────────
  const onScroll = () => {
    const el = scroller.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  };

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (heightBeforePrepend.current !== null) {
      el.scrollTop += el.scrollHeight - heightBeforePrepend.current; // keep the same message under the thumb after loading older ones
      heightBeforePrepend.current = null;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // ───────── Receiving: poll the latest page and merge (this also delivers deletes and "Seen") ─────────
  const poll = useCallback(async () => {
    try {
      const { data } = await api<MessageDTO[]>(`/api/conversations/${id}/messages?limit=30`);
      setMessages((prev) => mergeMessages(prev, data));
    } catch {
      /* transient (offline, sleeping laptop): the next tick tries again */
    }
  }, [id]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void poll();
      setReadTick((t) => t + 1);
    };
    const timer = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [poll]);

  // ───────── Presence: refreshed every 20s; the label re-computes every 30s ("Last active 8m ago") ─────────
  useEffect(() => {
    const refreshPresence = () => {
      if (document.visibilityState !== "visible") return;
      api<PresenceDTO>(`/api/conversations/${id}/presence`).then(({ data }) => setPresence(data)).catch(() => undefined);
    };
    const p = window.setInterval(refreshPresence, 20_000);
    const c = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => { window.clearInterval(p); window.clearInterval(c); };
  }, [id]);

  // ───────── Reading: only while the tab is visible and there is something unread from the other person ─────────
  const hasUnreadIncoming = messages.some((m) => !m.mine && !m.readAt && !m.deleted && !m.status);
  useEffect(() => {
    if (!hasUnreadIncoming || readInFlight.current || document.visibilityState !== "visible") return;
    readInFlight.current = true;
    api<UnreadCountsDTO>(`/api/conversations/${id}/read`, { method: "PATCH" })
      .then(({ data }) => {
        const now = new Date().toISOString();
        setMessages((prev) => prev.map((m) => (!m.mine && !m.readAt ? { ...m, readAt: now } : m)));
        updateCounts(data);
        void refreshInbox();
      })
      .catch(() => window.setTimeout(() => setReadTick((t) => t + 1), RETRY_READ_MS))
      .finally(() => {
        readInFlight.current = false;
      });
  }, [hasUnreadIncoming, id, readTick, updateCounts, refreshInbox]);

  // ───────── Sending ─────────
  const send = useCallback(
    async (text: string, retryClientId?: string, replyToId?: string) => {
      const clientId = retryClientId ?? newClientId();
      setNotice(null);
      stickToBottom.current = true;
      setMessages((prev) => [
        ...prev.filter((m) => !(m.status && m.clientId === clientId)),
        { id: `pending-${clientId}`, conversationId: id, senderId: "", mine: true, content: text, createdAt: new Date().toISOString(), readAt: null, deleted: false, clientId, status: "sending", editedAt: null, replyTo: null, reactions: [], replyToId },
      ]);
      try {
        const { data } = await postJson<MessageDTO>(`/api/conversations/${id}/messages`, { content: text, clientId, replyToId });
        setMessages((prev) => mergeMessages(prev, [data]));
        void refreshInbox();
      } catch (e) {
        const error = errorText(e, "We couldn't send that message.");
        setMessages((prev) => prev.map((m) => (m.status && m.clientId === clientId ? { ...m, status: "failed" as const, error } : m)));
      }
    },
    [id, refreshInbox],
  );

  // ───────── Per-message actions ─────────
  const patch = (next: MessageDTO) => setMessages((prev) => prev.map((x) => (x.id === next.id ? { ...x, ...next } : x)));

  const handlers: MessageHandlers = {
    async onReact(m: LocalMessage, type: ReactionType | null) {
      const before = m.reactions;
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, reactions: applyMyReaction(x.reactions, type) } : x)));
      try {
        const { data } = type ? await postJson<MessageDTO>(`/api/messages/${m.id}/reactions`, { type }) : await del<MessageDTO>(`/api/messages/${m.id}/reactions`);
        patch(data);
      } catch (e) {
        setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, reactions: before } : x)));
        setNotice(errorText(e, "We couldn't update your reaction."));
      }
    },
    onReply: (m) => setReplyTo(m),
    async onCopy(m) {
      try { await navigator.clipboard.writeText(m.content); setNotice(null); setToast("Copied"); } catch { setNotice("Your browser blocked copying. Select the text and copy it manually."); }
    },
    async onEdit(m, text) {
      try {
        const res = await fetch(`/api/messages/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: text }) });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) throw new Error(json?.error?.message ?? "We couldn't save your edit.");
        patch(json.data as MessageDTO);
        setNotice(null);
        void refreshInbox();
        return true;
      } catch (e) {
        setNotice(errorText(e, "We couldn't save your edit."));
        return false;
      }
    },
    onDelete: (m) => setDeleting(m),
    onRetry: (m) => void send(m.content, m.clientId ?? undefined, m.replyToId),
    onRemoveFailed: (m) => setMessages((prev) => prev.filter((x) => x.id !== m.id)),
  };

  async function confirmDelete(scope: "me" | "everyone") {
    const m = deleting;
    setDeleting(null);
    if (!m) return;
    try {
      await del(`/api/messages/${m.id}?scope=${scope}`);
      setMessages((prev) => (scope === "me" ? prev.filter((x) => x.id !== m.id) : prev.map((x) => (x.id === m.id ? { ...x, deleted: true, content: "", reactions: [], replyTo: null, editedAt: null } : x))));
      if (replyTo?.id === m.id) setReplyTo(null);
      void refreshInbox();
    } catch (e) {
      setNotice(errorText(e, "We couldn't delete that message."));
    }
  }

  async function loadOlder() {
    if (!cursor || loadingOlder) return;
    setLoadingOlder(true);
    setNotice(null);
    try {
      const { data, pagination } = await api<MessageDTO[]>(`/api/conversations/${id}/messages?before=${encodeURIComponent(cursor)}&limit=30`);
      heightBeforePrepend.current = scroller.current?.scrollHeight ?? null;
      setMessages((prev) => mergeMessages(prev, data));
      setHasMore(Boolean(pagination?.hasMore));
      setCursor(pagination?.nextCursor ?? null);
    } catch (e) {
      setNotice(errorText(e, "We couldn't load earlier messages."));
    } finally {
      setLoadingOlder(false);
    }
  }

  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(null), 1800); return () => window.clearTimeout(t); }, [toast]);

  const status = presenceLabel(presence, "precise", clock);
  const rows = useMemo(() => buildThread(messages), [messages]);
  const lastSeenId = useMemo(() => [...messages].reverse().find((m) => m.mine && !m.status && !m.deleted)?.id ?? null, [messages]);

  return (
    <>
      <header className="chat-head">
        <Link href="/messages" className="chat-back d-md-none" aria-label="Back to conversations">
          <i className="bi bi-arrow-left" aria-hidden="true" />
        </Link>
        <Link href={`/people/${person.id}`} className="chat-person" aria-label={`View ${person.name}'s profile`}>
          <Avatar name={person.name} src={person.avatarUrl} size={40} />
          <span className="chat-person-text">
            <span className="chat-person-name text-truncate d-block" title={person.name}>{person.name}</span>
            {status ? (
              <span className="chat-person-sub d-flex align-items-center gap-1 text-truncate" aria-live="polite">
                <span className={`presence-dot ${presence.online ? "online" : "away"}`} aria-hidden="true" />{status}
              </span>
            ) : person.headline ? <span className="chat-person-sub text-truncate d-block" title={person.headline}>{person.headline}</span> : null}
          </span>
        </Link>
      </header>

      <div className="chat-scroll" ref={scroller} onScroll={onScroll}>
        {hasMore && (
          <div className="text-center mb-2">
            <button type="button" className="btn btn-soft btn-sm" onClick={loadOlder} disabled={loadingOlder}>
              {loadingOlder ? "Loading…" : "Load earlier messages"}
            </button>
          </div>
        )}

        {rows.length === 0 ? (
          <div className="chat-empty">
            <i className="bi bi-chat-heart" aria-hidden="true" />
            <p className="mb-0">No messages yet. Say hello to {person.name}.</p>
          </div>
        ) : (
          <ul className="chat-list" role="log" aria-live="polite" aria-relevant="additions" aria-label={`Conversation with ${person.name}`}>
            {rows.map((row) => {
              if (row.kind === "day") {
                return <li key={row.key} className="chat-day" role="separator"><span>{row.label}</span></li>;
              }
              return <MessageItem key={row.key} m={row.message} first={row.first} last={row.last} showSeen={row.message.id === lastSeenId} h={handlers} />;
            })}
          </ul>
        )}
      </div>

      {toast && <div className="chat-toast" role="status">{toast}</div>}
      {deleting && <DeleteMessageDialog m={deleting} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />}

      {notice && <div className="chat-notice" role="alert">{notice}</div>}

      {conversation.canSend ? (
        <MessageComposer onSend={(text) => { void send(text, undefined, replyTo?.id); setReplyTo(null); }} replyingTo={replyTo ? { name: replyTo.mine ? "yourself" : person.name, text: replyTo.content } : null} onCancelReply={() => setReplyTo(null)} />
      ) : (
        <div className="chat-locked" role="status">
          <i className="bi bi-lock me-2" aria-hidden="true" />
          {conversation.sendBlockedReason ?? "You can't send new messages in this conversation."}
        </div>
      )}
    </>
  );
}

/** "Delete message": choose Delete for me / Delete for everyone (sender only), or Cancel. */
function DeleteMessageDialog({ m, onCancel, onConfirm }: { m: LocalMessage; onCancel: () => void; onConfirm: (scope: "me" | "everyone") => void }) {
  const canEveryone = m.mine && !m.deleted;
  const [scope, setScope] = useState<"me" | "everyone">("me");
  const panel = useRef<HTMLDivElement>(null);
  const close = useCallback(onCancel, [onCancel]);
  useDismissable(true, panel, close);
  useEffect(() => { panel.current?.focus(); }, []);
  return (
    <div className="modal-scrim" role="presentation">
      <div ref={panel} className="modal-sheet" role="alertdialog" aria-modal="true" aria-labelledby="del-title" tabIndex={-1}>
        <header className="modal-sheet-head"><h2 id="del-title" className="h6 mb-0">Delete message?</h2></header>
        <div className="p-3">
          <label className="del-option"><input type="radio" name="scope" checked={scope === "me"} onChange={() => setScope("me")} /><span><strong>Delete for me</strong><span className="d-block small text-muted">Removes it from your view only. {`${""}`}The other person can still see it.</span></span></label>
          {canEveryone && <label className="del-option"><input type="radio" name="scope" checked={scope === "everyone"} onChange={() => setScope("everyone")} /><span><strong>Delete for everyone</strong><span className="d-block small text-muted">Removes the message for both of you. They will see &quot;This message was deleted&quot;.</span></span></label>}
          <div className="d-flex gap-2 justify-content-end mt-3">
            <button type="button" className="btn btn-link" onClick={onCancel}>Cancel</button>
            <button type="button" className="btn btn-danger" onClick={() => onConfirm(scope)}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}
