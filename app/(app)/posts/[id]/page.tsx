import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostCard } from "@/components/social/PostCard";
import { getCurrentUserId } from "@/lib/session";
import { AppError } from "@/lib/errors";
import { postService } from "@/services/social/post.service";

export const metadata: Metadata = { title: "Post" };

/** One post with its comments open. Visibility is enforced on the server; a restricted post looks exactly like a missing one. */
export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const post = await postService.get(userId, id.slice(0, 50)).catch((e) => {
    if (e instanceof AppError && e.code === "NOT_FOUND") return null;
    throw e;
  });
  if (!post) notFound();
  return (
    <div className="narrow-page">
      <Link href="/" className="small">← Back to feed</Link>
      <div className="mt-3"><PostCard post={post} standalone /></div>
    </div>
  );
}
