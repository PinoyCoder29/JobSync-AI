import type { ReactionType } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { canDeleteComment, validReplyParent } from "@/lib/permissions/post";
import { enforceRateLimit } from "@/lib/rate-limit";
import { commentRepository } from "@/repositories/comment.repository";
import { blockRepository } from "@/repositories/networking.repository";
import { postRepository } from "@/repositories/post.repository";
import { toCommentDTO, toCommentTree, type RelationshipLookup } from "./mappers";
import { notificationService } from "./notification.service";
import { requireViewablePost } from "./post.service";
import type { CommentDTO, Relationship } from "./types";

const PAGE_SIZE = 10;
const NOT_FOUND = "This comment isn't available.";

async function relationshipLookup(viewerId: string | null, authorIds: string[]): Promise<RelationshipLookup> {
  const unique = [...new Set(authorIds)];
  const [connected, following] = await Promise.all([
    viewerId ? postRepository.connectedAmong(viewerId, unique) : Promise.resolve(new Set<string>()),
    viewerId ? postRepository.followedAmong(viewerId, unique) : Promise.resolve(new Set<string>()),
  ]);
  return (id): Relationship => (id === viewerId ? "self" : connected.has(id) ? "connection" : following.has(id) ? "following" : "none");
}

export const commentService = {
  async list(viewerId: string | null, postId: string, cursor?: string) {
    const post = await requireViewablePost(viewerId, postId);
    const hidden = viewerId ? [...(await blockRepository.hiddenUserIds(viewerId))] : [];
    const page = await commentRepository.listForPost({ postId, viewerId, hiddenIds: hidden, cursor, take: PAGE_SIZE });
    const lookup = await relationshipLookup(viewerId, page.items.flatMap((c) => [c.authorId, ...c.replies.map((r) => r.authorId)]));
    return { items: page.items.map((c) => toCommentTree(c, viewerId, post.authorId, lookup)), hasMore: page.hasMore, nextCursor: page.nextCursor };
  },

  async add(userId: string, postId: string, input: { content: string; parentId?: string }): Promise<CommentDTO> {
    const post = await requireViewablePost(userId, postId);
    enforceRateLimit(userId, "comment");

    let parentAuthorId: string | null = null;
    if (input.parentId) {
      const parent = await commentRepository.findById(input.parentId);
      // one reply level only: the parent must be a top-level comment on THIS post
      if (!validReplyParent(parent, postId)) throw new AppError("You can only reply to a top-level comment.");
      if (await blockRepository.isBlockedEitherWay(userId, parent!.authorId)) throw new AppError(NOT_FOUND, "NOT_FOUND");
      parentAuthorId = parent!.authorId;
    }

    const created = await commentRepository.create({ postId, authorId: userId, content: input.content, parentId: input.parentId }, userId);
    if (parentAuthorId) {
      notificationService.notify({ recipientId: parentAuthorId, actorId: userId, type: "COMMENT_REPLY", postId, commentId: created.id });
      if (post.authorId !== parentAuthorId) notificationService.notify({ recipientId: post.authorId, actorId: userId, type: "POST_COMMENT", postId, commentId: created.id });
    } else {
      notificationService.notify({ recipientId: post.authorId, actorId: userId, type: "POST_COMMENT", postId, commentId: created.id });
    }
    const lookup = await relationshipLookup(userId, [userId]);
    return toCommentDTO(created, userId, post.authorId, lookup);
  },

  async delete(userId: string, commentId: string): Promise<void> {
    const comment = await commentRepository.findById(commentId);
    if (!comment || !canDeleteComment(userId, comment.authorId, comment.post.authorId)) throw new AppError(NOT_FOUND, "NOT_FOUND");
    await commentRepository.delete(commentId);
  },

  async react(userId: string, commentId: string, type: ReactionType) {
    const comment = await commentRepository.findById(commentId);
    if (!comment) throw new AppError(NOT_FOUND, "NOT_FOUND");
    await requireViewablePost(userId, comment.postId);
    enforceRateLimit(userId, "reaction");
    await commentRepository.setReaction(commentId, userId, type);
    return { reaction: type, total: await commentRepository.countReactions(commentId) };
  },

  async unreact(userId: string, commentId: string) {
    const comment = await commentRepository.findById(commentId);
    if (!comment) throw new AppError(NOT_FOUND, "NOT_FOUND");
    await requireViewablePost(userId, comment.postId);
    await commentRepository.removeReaction(commentId, userId);
    return { reaction: null, total: await commentRepository.countReactions(commentId) };
  },

  async report(userId: string, commentId: string, input: { reason: string; details?: string }) {
    const comment = await commentRepository.findById(commentId);
    if (!comment) throw new AppError(NOT_FOUND, "NOT_FOUND");
    await requireViewablePost(userId, comment.postId);
    if (comment.authorId === userId) throw new AppError("You can't report your own comment.");
    enforceRateLimit(userId, "report");
    if (await postRepository.findReport(userId, { commentId })) throw new AppError("You've already reported this comment.", "CONFLICT");
    await postRepository.createReport({ reporterId: userId, targetType: "COMMENT", commentId, reason: input.reason, details: input.details });
    return { reported: true };
  },
};
