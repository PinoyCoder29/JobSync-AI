"use client";

import { useState } from "react";
import { PostCard } from "./PostCard";
import { api } from "@/lib/client/api";
import type { PostDTO } from "@/services/social/types";

export function SavedPostsList({ initial, initialCursor, initialHasMore }: { initial: PostDTO[]; initialCursor: string | null; initialHasMore: boolean }) {
  const [items, setItems] = useState(initial);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function more() {
    if (!cursor || busy) return;
    setBusy(true); setError(null);
    try {
      const { data, pagination } = await api<PostDTO[]>(`/api/saved-posts?cursor=${encodeURIComponent(cursor)}`);
      setItems((p) => [...p, ...data.filter((d) => !p.some((x) => x.id === d.id))]);
      setCursor(pagination?.nextCursor ?? null); setHasMore(Boolean(pagination?.hasMore));
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't load more."); } finally { setBusy(false); }
  }
  return (
    <>
      <div className="d-grid gap-3">{items.map((p) => <PostCard key={p.id} post={p} onDeleted={(id) => setItems((l) => l.filter((x) => x.id !== id))} />)}</div>
      {error && <p role="alert" className="small text-danger mt-2">{error}</p>}
      {hasMore && <div className="text-center mt-3"><button type="button" className="btn btn-outline-brand" disabled={busy} onClick={more}>{busy ? "Loading…" : "Load more"}</button></div>}
    </>
  );
}
