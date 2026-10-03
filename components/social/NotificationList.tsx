"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { api, postJson } from "@/lib/client/api";
import { relativeTime } from "@/lib/time";
import type { NotificationDTO } from "@/services/social/types";

type Page = { items: NotificationDTO[]; unread: number };

export function NotificationList({ initial, initialCursor, initialHasMore, initialUnread }: { initial: NotificationDTO[]; initialCursor: string | null; initialHasMore: boolean; initialUnread: number }) {
  const [items, setItems] = useState(initial);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [unread, setUnread] = useState(initialUnread);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markAll() {
    try { await postJson("/api/notifications"); setItems((l) => l.map((n) => ({ ...n, read: true }))); setUnread(0); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn't mark as read."); }
  }
  async function markOne(id: string) {
    setItems((l) => l.map((n) => (n.id === id ? { ...n, read: true } : n)));
    postJson("/api/notifications", { id }).then(({ data }) => setUnread((data as { unread: number }).unread)).catch(() => {});
  }
  async function more() {
    if (!cursor || busy) return;
    setBusy(true); setError(null);
    try {
      const { data, pagination } = await api<Page>(`/api/notifications?cursor=${encodeURIComponent(cursor)}`);
      setItems((p) => [...p, ...data.items.filter((d) => !p.some((x) => x.id === d.id))]);
      setCursor(pagination?.nextCursor ?? null); setHasMore(Boolean(pagination?.hasMore));
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't load more."); } finally { setBusy(false); }
  }

  if (items.length === 0) return <EmptyState icon="bi-bell" title="You're all caught up." text="We'll let you know when people connect with you, react to your posts or when a job matches your alerts." />;
  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="small text-muted" role="status">{unread > 0 ? `${unread} unread` : "All read"}</span>
        {unread > 0 && <button type="button" className="btn btn-soft btn-sm" onClick={markAll}>Mark all as read</button>}
      </div>
      <ul className="notification-list">
        {items.map((n) => (
          <li key={n.id} className={n.read ? "" : "unread"}>
            <Link href={n.href} onClick={() => !n.read && markOne(n.id)}>
              {n.actor ? <Avatar name={n.actor.name} src={n.actor.avatarUrl} size={40} /> : <span className="notif-icon" aria-hidden="true"><i className="bi bi-briefcase" /></span>}
              <span className="min-w-0"><span className="d-block">{n.text}</span><span className="small text-muted">{relativeTime(n.createdAt)}</span></span>
              {!n.read && <span className="unread-dot" aria-label="Unread" />}
            </Link>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="small text-danger">{error}</p>}
      {hasMore && <div className="text-center mt-3"><button type="button" className="btn btn-outline-brand" disabled={busy} onClick={more}>{busy ? "Loading…" : "Load more"}</button></div>}
    </>
  );
}
