import type { PostVisibility } from "@prisma/client";

export type PostAccessInput = {
  viewerId: string | null;
  authorId: string;
  visibility: PostVisibility;
  /** viewer and author have an ACCEPTED connection */
  connected: boolean;
  /** either user has blocked the other */
  blocked: boolean;
};

/**
 * The single source of truth for "can this viewer see this post?".
 * The feed query applies the same rules in SQL; this function guards every single-post read and write path.
 */
export function canViewPost({ viewerId, authorId, visibility, connected, blocked }: PostAccessInput): boolean {
  if (viewerId && viewerId === authorId) return true;
  if (blocked) return false;
  if (visibility === "PUBLIC") return true;
  if (visibility === "CONNECTIONS_ONLY") return Boolean(viewerId) && connected;
  return false;
}

export const canEditPost = (userId: string, authorId: string) => userId === authorId;
export const canDeletePost = (userId: string, authorId: string) => userId === authorId;

/** Authors can delete their own comments; the post owner can also remove comments on their post. */
export const canDeleteComment = (userId: string, commentAuthorId: string, postAuthorId: string) =>
  userId === commentAuthorId || userId === postAuthorId;

/** Only public posts can be re-shared, so a share can never widen who sees a restricted post. */
export const canSharePost = (visibility: PostVisibility) => visibility === "PUBLIC";

/** One reply level only: a reply's parent must be a top-level comment on the same post. */
export function validReplyParent(parent: { postId: string; parentId: string | null } | null, postId: string): boolean {
  return Boolean(parent) && parent!.postId === postId && parent!.parentId === null;
}
