"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useUnreadCounts } from "@/components/layout/UnreadCounts";
import { Avatar } from "@/components/ui/Avatar";
import { api, del, postJson } from "@/lib/client/api";
import { buildThread, clockTime, mergeMessages, type LocalMessage } from "@/lib/messaging/thread";
import type { ConversationDetailDTO, MessageDTO, MessagePageDTO, UnreadCountsDTO } from "@/services/messaging/types";
import { MessageComposer } from "./MessageComposer";
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
  const [readTick, setReadTick] = useState(0);

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
    async (text: string, retryClientId?: string) => {
      const clientId = retryClientId ?? newClientId();
      setNotice(null);
      stickToBottom.current = true;
      setMessages((prev) => [
        ...prev.filter((m) => !(m.status && m.clientId === clientId)),
        { id: `pending-${clientId}`, conversationId: id, senderId: "", mine: true, content: text, createdAt: new Date().toISOString(), readAt: null, deleted: false, clientId, status: "sending" },
      ]);
      try {
        const { data } = await postJson<MessageDTO>(`/api/conversations/${id}/messages`, { content: text, clientId });
        setMessages((prev) => mergeMessages(prev, [data]));
        void refreshInbox();
      } catch (e) {
        const error = errorText(e, "We couldn't send that message.");
        setMessages((prev) => prev.map((m) => (m.status && m.clientId === clientId ? { ...m, status: "failed" as const, error } : m)));
      }
    },
    [id, refreshInbox],
  );

  async function remove(m: LocalMessage) {
    if (!window.confirm("Delete this message? This can't be undone.")) return;
    try {
      await del(`/api/messages/${m.id}`);
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, deleted: true, content: "" } : x)));
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
            {person.headline && <span className="chat-person-sub text-truncate d-block" title={person.headline}>{person.headline}</span>}
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
              const { message: m, first, last } = row;
              const stateClass = m.deleted ? "deleted" : m.status ?? "";
              return (
                <li key={row.key} className={`msg ${m.mine ? "mine" : "theirs"} ${first ? "first" : ""} ${last ? "last" : ""}`}>
                  <div className="msg-row">
                    {m.mine && !m.status && !m.deleted && (
                      <button type="button" className="msg-action" onClick={() => remove(m)} aria-label="Delete this message" title="Delete">
                        <i className="bi bi-trash3" aria-hidden="true" />
                      </button>
                    )}
                    <div className={`msg-bubble ${stateClass}`}>{m.deleted ? "This message was deleted" : m.content}</div>
                  </div>
                  {m.status === "failed" ? (
                    <div className="msg-meta text-danger" role="alert">
                      Not sent. {m.error && <span>{m.error} </span>}
                      <button type="button" className="link-btn" onClick={() => send(m.content, m.clientId ?? undefined)}>Retry</button>
                      {" · "}
                      <button type="button" className="link-btn" onClick={() => setMessages((prev) => prev.filter((x) => x.id !== m.id))}>Remove</button>
                    </div>
                  ) : m.status === "sending" ? (
                    <div className="msg-meta">Sending…</div>
                  ) : last || m.id === lastSeenId ? (
                    <div className="msg-meta">
                      <time dateTime={m.createdAt} suppressHydrationWarning>{clockTime(m.createdAt)}</time>
                      {m.id === lastSeenId && m.readAt && <span> · Seen</span>}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {notice && <div className="chat-notice" role="alert">{notice}</div>}

      {conversation.canSend ? (
        <MessageComposer onSend={(text) => void send(text)} />
      ) : (
        <div className="chat-locked" role="status">
          <i className="bi bi-lock me-2" aria-hidden="true" />
          {conversation.sendBlockedReason ?? "You can't send new messages in this conversation."}
        </div>
      )}
    </>
  );
}
