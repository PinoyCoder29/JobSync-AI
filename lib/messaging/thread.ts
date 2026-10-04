/**
 * Pure helpers for the chat thread. No React, no server imports: used by the UI and covered by unit tests.
 */
import type { MessageDTO } from "@/services/messaging/types";

export type LocalMessage = MessageDTO & {
  /** Only on messages that exist in this browser but are not confirmed by the server yet. */
  status?: "sending" | "failed";
  error?: string;
};

const byTime = (a: MessageDTO, b: MessageDTO) => (a.createdAt === b.createdAt ? (a.id < b.id ? -1 : 1) : a.createdAt < b.createdAt ? -1 : 1);

/**
 * Merges server messages into the local list.
 *  - the server's version of a message always wins (so deletes and "seen" flow in),
 *  - a pending/failed local message disappears as soon as the server returns the same clientId,
 *  - confirmed messages are ordered by time, pending ones stay at the end in the order they were typed.
 */
export function mergeMessages(existing: LocalMessage[], incoming: MessageDTO[]): LocalMessage[] {
  const confirmed = new Map<string, LocalMessage>();
  for (const m of existing) if (!m.status) confirmed.set(m.id, m);
  for (const m of incoming) confirmed.set(m.id, m);

  const arrived = new Set(incoming.flatMap((m) => (m.clientId ? [m.clientId] : [])));
  const knownClientIds = new Set([...confirmed.values()].flatMap((m) => (m.clientId ? [m.clientId] : [])));
  const pending = existing.filter((m) => m.status && !(m.clientId && (arrived.has(m.clientId) || knownClientIds.has(m.clientId))));

  return [...[...confirmed.values()].sort(byTime), ...pending];
}

/** Calendar-day label: "Today", "Yesterday", weekday for the last week, otherwise a date. */
export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days > 1 && days < 7) return d.toLocaleDateString("en-PH", { weekday: "long" });
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

export const sameDay = (a: string, b: string) => new Date(a).toDateString() === new Date(b).toDateString();

const GROUP_WINDOW_MS = 5 * 60_000;

export type ThreadRow =
  | { kind: "day"; key: string; label: string }
  | { kind: "message"; key: string; message: LocalMessage; first: boolean; last: boolean };

/** Day separators + grouping: consecutive messages from one sender within 5 minutes share a visual group. */
export function buildThread(messages: LocalMessage[], now = new Date()): ThreadRow[] {
  const rows: ThreadRow[] = [];
  messages.forEach((message, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const newDay = !prev || !sameDay(prev.createdAt, message.createdAt);
    if (newDay) rows.push({ kind: "day", key: `day-${message.id}`, label: dayLabel(message.createdAt, now) });

    const joinsPrev = !!prev && !newDay && prev.mine === message.mine && new Date(message.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_WINDOW_MS;
    const joinsNext = !!next && sameDay(next.createdAt, message.createdAt) && next.mine === message.mine && new Date(next.createdAt).getTime() - new Date(message.createdAt).getTime() < GROUP_WINDOW_MS;
    rows.push({ kind: "message", key: message.id, message, first: !joinsPrev, last: !joinsNext });
  });
  return rows;
}

/** Collapses whitespace and shortens for list previews. The UI still adds an ellipsis with CSS when space runs out. */
export function previewText(content: string, max = 140): string {
  const flat = content.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

export const clockTime = (iso: string) => new Date(iso).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });

/** Total unread across a conversation list. */
export const totalUnread = (list: { unread: number }[]) => list.reduce((n, c) => n + c.unread, 0);
