"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Composer } from "./Composer";
import { InsightCard } from "./InsightCard";
import { JobFeedCard } from "./JobFeedCard";
import { PostCard } from "./PostCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/client/api";
import type { FeedItemDTO, FeedPageDTO, PostDTO } from "@/services/social/types";

function FeedSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading more posts" className="d-grid gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="feed-card" aria-hidden="true">
          <div className="d-flex gap-3 mb-3"><div className="skeleton" style={{ width: 44, height: 44, borderRadius: "50%" }} /><div className="flex-grow-1"><div className="skeleton mb-2" style={{ height: 14, width: "40%" }} /><div className="skeleton" style={{ height: 12, width: "25%" }} /></div></div>
          <div className="skeleton mb-2" style={{ height: 14 }} /><div className="skeleton mb-2" style={{ height: 14, width: "85%" }} /><div className="skeleton" style={{ height: 120 }} />
        </div>
      ))}
    </div>
  );
}

/**
 * The interactive home feed: composer + posts + recommended job cards. The first page is rendered on the server
 * (no loading flash); further pages come from /api/feed with an explicit "Load more" button.
 */
export function FeedList({ initial, viewer }: { initial: FeedPageDTO; viewer: { name: string; avatarUrl: string | null } }) {
  const [items, setItems] = useState<FeedItemDTO[]>(initial.items);
  const [cursor, setCursor] = useState<string | null>(initial.nextCursor);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api<FeedPageDTO>(`/api/feed?cursor=${encodeURIComponent(cursor)}`);
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.key));
        return [...prev, ...data.items.filter((i) => !seen.has(i.key))];
      });
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't load more posts.");
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

  const prepend = (post: PostDTO) => setItems((prev) => [{ kind: "post", key: `p-${post.id}`, post }, ...prev.filter((i) => i.key !== `p-${post.id}`)]);
  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.key !== `p-${id}`));
  const hasPosts = items.some((i) => i.kind === "post");

  return (
    <div className="feed-column">
      <Composer name={viewer.name} avatarUrl={viewer.avatarUrl} onPosted={prepend} />

      {items.length === 0 ? (
        <EmptyState icon="bi-stars" title="Your feed is getting started." text="Connect with professionals and follow companies to discover career content." href="/network" actionLabel="Find people to connect with" />
      ) : (
        <div className="d-grid gap-3 mt-3">
          {items.map((item) =>
            item.kind === "post" ? <PostCard key={item.key} post={item.post} onDeleted={remove} onCreated={prepend} />
            : item.kind === "job" ? <JobFeedCard key={item.key} job={item.job} />
            : <InsightCard key={item.key} insight={item.insight} />,
          )}
        </div>
      )}

      {!hasPosts && items.length > 0 && (
        <p className="small text-muted text-center mt-3">Your feed is getting started. <Link href="/network">Connect with professionals</Link> to see more posts.</p>
      )}

      {loading && <div className="mt-3"><FeedSkeleton /></div>}
      {error && (
        <div className="empty-state error mt-3" role="alert">
          <p className="mb-2">We couldn&apos;t load more posts.</p>
          <button type="button" className="btn btn-brand btn-sm" onClick={loadMore}>Try again</button>
        </div>
      )}
      {hasMore && !loading && !error && (
        <div className="text-center mt-3"><button type="button" className="btn btn-outline-brand" onClick={loadMore}>Load more</button></div>
      )}
      {!hasMore && hasPosts && <p className="text-center small text-muted mt-4">You&apos;re all caught up.</p>}
    </div>
  );
}
