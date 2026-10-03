import type { Prisma, ReactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const AUTHOR_SELECT = {
  id: true,
  name: true,
  image: true,
  profile: { select: { headline: true, visibility: true, profileVisible: true, avatarMedia: { select: { url: true } } } },
} satisfies Prisma.UserSelect;

export function commentSelect(viewerId: string | null) {
  return {
    id: true,
    postId: true,
    parentId: true,
    content: true,
    createdAt: true,
    authorId: true,
    author: { select: AUTHOR_SELECT },
    _count: { select: { reactions: true, replies: true } },
    reactions: { where: { userId: viewerId ?? "__none__" }, select: { type: true }, take: 1 },
  } satisfies Prisma.CommentSelect;
}

export type CommentRecord = Prisma.CommentGetPayload<{ select: ReturnType<typeof commentSelect> }>;
export type CommentWithReplies = CommentRecord & { replies: CommentRecord[] };

const REPLIES_SHOWN = 20;

export const commentRepository = {
  findById(id: string) {
    return prisma.comment.findUnique({ where: { id }, select: { id: true, postId: true, parentId: true, authorId: true, post: { select: { authorId: true, visibility: true } } } });
  },

  /** Top-level comments, oldest first, with up to 20 replies each. Hidden (blocked) authors are filtered in SQL. */
  async listForPost(input: { postId: string; viewerId: string | null; hiddenIds: string[]; cursor?: string; take: number }) {
    const { postId, viewerId, hiddenIds, cursor, take } = input;
    const rows = await prisma.comment.findMany({
      where: { postId, parentId: null, authorId: { notIn: hiddenIds } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        ...commentSelect(viewerId),
        replies: {
          where: { authorId: { notIn: hiddenIds } },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          take: REPLIES_SHOWN,
          select: commentSelect(viewerId),
        },
      },
    });
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    return { items: items as CommentWithReplies[], hasMore, nextCursor: hasMore ? items[items.length - 1].id : null };
  },

  create(data: { postId: string; authorId: string; content: string; parentId?: string }, viewerId: string) {
    return prisma.comment.create({ data, select: commentSelect(viewerId) });
  },

  /** Removing a top-level comment removes its replies too (cascade). */
  delete(id: string) {
    return prisma.comment.delete({ where: { id } });
  },

  setReaction(commentId: string, userId: string, type: ReactionType) {
    return prisma.commentReaction.upsert({
      where: { commentId_userId: { commentId, userId } },
      create: { commentId, userId, type },
      update: { type },
    });
  },
  removeReaction(commentId: string, userId: string) {
    return prisma.commentReaction.deleteMany({ where: { commentId, userId } });
  },
  countReactions(commentId: string) {
    return prisma.commentReaction.count({ where: { commentId } });
  },
};
