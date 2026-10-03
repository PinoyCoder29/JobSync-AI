import type { Metadata } from "next";
import { SavedPostsList } from "@/components/social/SavedPostsList";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireUserId } from "@/lib/session";
import { postService } from "@/services/social/post.service";

export const metadata: Metadata = { title: "Saved posts" };

export default async function SavedPostsPage() {
  const userId = await requireUserId();
  const page = await postService.listSaved(userId).catch((e) => { console.error("Saved posts failed", e); return null; });
  return (
    <div className="narrow-page">
      <h1 className="page-title">Saved posts</h1>
      {!page ? (
        <div className="empty-state error" role="alert"><p className="mb-0">We couldn&apos;t load your saved posts. Please refresh to try again.</p></div>
      ) : page.items.length === 0 ? (
        <EmptyState icon="bi-bookmark-heart" title="You haven't saved any posts yet." text="Use Save on a post to keep it here." href="/" actionLabel="Go to your feed" />
      ) : (
        <SavedPostsList initial={page.items} initialCursor={page.nextCursor} initialHasMore={page.hasMore} />
      )}
    </div>
  );
}
