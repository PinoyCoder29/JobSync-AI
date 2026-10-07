import type { Prisma, PostType, PostVisibility, ReactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Only these author fields ever leave the database for a post. Never email or password hash. */
const AUTHOR_SELECT = {
  id: true,
  name: true,
  image: true,
  profile: { select: { headline: true, visibility: true, profileVisible: true, avatarMedia: { select: { url: true } } } },
} satisfies Prisma.UserSelect;

const MEDIA_SELECT = {
  orderBy: { sortOrder: "asc" },
  select: { alt: true, media: { select: { url: true, width: true, height: true } } },
} satisfies Prisma.Post$mediaArgs;

const JOB_SELECT = {
  id: true,
  title: true,
  company: true,
  location: true,
  workArrangement: true,
  employmentType: true,
  experienceLevel: true,
  salaryMin: true,
  salaryMax: true,
  currency: true,
  isActive: true,
  postedAt: true,
  skills: { select: { required: true, skill: { select: { name: true } } }, take: 8 },
} satisfies Prisma.JobSelect;

/** Viewer-specific fields (own reaction, saved flag) are part of the same query, so there is no N+1. */
export function postSelect(viewerId: string | null) {
  return {
    id: true,
    content: true,
    postType: true,
    visibility: true,
    title: true,
    linkUrl: true,
    createdAt: true,
    editedAt: true,
    authorId: true,
    sharedPostId: true,
    author: { select: AUTHOR_SELECT },
    media: MEDIA_SELECT,
    job: { select: JOB_SELECT },
    sharedPost: {
      select: {
        id: true,
        content: true,
        visibility: true,
        postType: true,
        title: true,
        createdAt: true,
        authorId: true,
        author: { select: AUTHOR_SELECT },
        media: { ...MEDIA_SELECT, take: 1 },
      },
    },
    _count: { select: { reactions: true, comments: true, shares: true } },
    reactions: viewerId ? { where: { userId: viewerId }, select: { type: true }, take: 1 } : { where: { userId: "__none__" }, select: { type: true }, take: 1 },
    savedBy: viewerId ? { where: { userId: viewerId }, select: { id: true }, take: 1 } : { where: { userId: "__none__" }, select: { id: true }, take: 1 },
  } satisfies Prisma.PostSelect;
}

export type PostRecord = Prisma.PostGetPayload<{ select: ReturnType<typeof postSelect> }>;

export type NewPostMedia = { url: string; publicId: string; mimeType: string; width: number | null; height: number | null; bytes: number; resourceType: string };

/** (createdAt, id) keyset cursor: stable even when posts are created or deleted between page loads. */
export const encodePostCursor = (createdAt: Date, id: string) => Buffer.from(`${createdAt.toISOString()}|${id}`).toString("base64url");
export function decodePostCursor(cursor?: string | null): { createdAt: Date; id: string } | null {
  if (!cursor) return null;
  try {
    const [iso, id] = Buffer.from(cursor, "base64url").toString().split("|");
    const createdAt = new Date(iso);
    return id && !Number.isNaN(createdAt.getTime()) ? { createdAt, id } : null;
  } catch {
    return null;
  }
}

export const postRepository = {
  /** Minimal columns for permission checks. */
  findAccessInfo(id: string) {
    return prisma.post.findUnique({
      where: { id },
      select: { id: true, authorId: true, visibility: true, sharedPostId: true, postType: true },
    });
  },

  findById(id: string, viewerId: string | null) {
    return prisma.post.findUnique({ where: { id }, select: postSelect(viewerId) });
  },

  findByIds(ids: string[], viewerId: string | null) {
    return prisma.post.findMany({ where: { id: { in: ids } }, select: postSelect(viewerId) });
  },

  create(input: {
    authorId: string;
    content?: string;
    postType: PostType;
    visibility: PostVisibility;
    title?: string;
    linkUrl?: string;
    jobId?: string;
    sharedPostId?: string;
    media?: NewPostMedia[];
  }) {
    const { media = [], ...rest } = input;
    return prisma.post.create({
      data: {
        ...rest,
        media: {
          create: media.map((m, index) => ({
            sortOrder: index,
            media: {
              create: {
                url: m.url,
                publicId: m.publicId,
                resourceType: m.resourceType,
                mimeType: m.mimeType,
                width: m.width,
                height: m.height,
                size: m.bytes,
                kind: "POST",
                ownerId: input.authorId,
              },
            },
          })),
        },
      },
      select: { id: true },
    });
  },

  /** Compare on authorId so only the owner's row can ever change. Returns false when nothing matched. */
  async updateOwned(id: string, authorId: string, data: { content?: string | null; title?: string | null; visibility?: PostVisibility }) {
    const result = await prisma.post.updateMany({ where: { id, authorId }, data: { ...data, editedAt: new Date() } });
    return result.count === 1;
  },

  /** Deletes the post and its Media rows in one transaction. Returns the Cloudinary ids to remove afterwards. */
  async deleteOwned(id: string, authorId: string): Promise<string[] | null> {
    return prisma.$transaction(async (tx) => {
      const post = await tx.post.findFirst({ where: { id, authorId }, select: { media: { select: { media: { select: { id: true, publicId: true } } } } } });
      if (!post) return null;
      const media = post.media.map((m) => m.media);
      await tx.post.delete({ where: { id } });
      if (media.length) await tx.media.deleteMany({ where: { id: { in: media.map((m) => m.id) }, ownerId: authorId } });
      return media.map((m) => m.publicId);
    });
  },

  /**
   * One page of the chronological candidate stream the viewer is allowed to see. The visibility rules here mirror
   * `canViewPost` and are enforced in SQL, so a restricted post is never even loaded.
   */
  feedPage(input: { viewerId: string; hiddenIds: string[]; cursor: { createdAt: Date; id: string } | null; take: number }) {
    const { viewerId, hiddenIds, cursor, take } = input;
    const and: Prisma.PostWhereInput[] = [
      { authorId: { notIn: hiddenIds } },
      {
        OR: [
          { visibility: "PUBLIC" },
          { authorId: viewerId },
          {
            visibility: "CONNECTIONS_ONLY",
            author: {
              OR: [
                { connectionsSent: { some: { addresseeId: viewerId, status: "ACCEPTED" } } },
                { connectionsReceived: { some: { requesterId: viewerId, status: "ACCEPTED" } } },
              ],
            },
          },
        ],
      },
    ];
    if (cursor) {
      and.push({ OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] });
    }
    return prisma.post.findMany({
      where: { AND: and },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      select: postSelect(viewerId),
    });
  },

  /** Posts by one author that this viewer may see (profile pages). */
  authorPage(input: { viewerId: string | null; authorId: string; connected: boolean; cursor: { createdAt: Date; id: string } | null; take: number }) {
    const { viewerId, authorId, connected, cursor, take } = input;
    const isSelf = viewerId === authorId;
    const and: Prisma.PostWhereInput[] = [{ authorId }];
    if (!isSelf) and.push({ visibility: { in: connected ? ["PUBLIC", "CONNECTIONS_ONLY"] : ["PUBLIC"] } });
    if (cursor) and.push({ OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] });
    return prisma.post.findMany({ where: { AND: and }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: take + 1, select: postSelect(viewerId) });
  },

  /** Reaction totals per type for a set of posts, in a single grouped query. */
  async reactionBreakdown(postIds: string[]) {
    if (postIds.length === 0) return new Map<string, Partial<Record<ReactionType, number>>>();
    const rows = await prisma.postReaction.groupBy({ by: ["postId", "type"], where: { postId: { in: postIds } }, _count: { _all: true } });
    const map = new Map<string, Partial<Record<ReactionType, number>>>();
    for (const r of rows) map.set(r.postId, { ...(map.get(r.postId) ?? {}), [r.type]: r._count._all });
    return map;
  },

  // ───────── reactions (one row per user per post) ─────────
  setReaction(postId: string, userId: string, type: ReactionType) {
    return prisma.postReaction.upsert({
      where: { postId_userId: { postId, userId } },
      create: { postId, userId, type },
      update: { type },
    });
  },
  removeReaction(postId: string, userId: string) {
    return prisma.postReaction.deleteMany({ where: { postId, userId } });
  },
  reactionSummary(postId: string) {
    return prisma.postReaction.groupBy({ by: ["type"], where: { postId }, _count: { _all: true } });
  },

  // ───────── saved posts ─────────
  savePost(userId: string, postId: string) {
    return prisma.savedPost.upsert({ where: { userId_postId: { userId, postId } }, create: { userId, postId }, update: {} });
  },
  unsavePost(userId: string, postId: string) {
    return prisma.savedPost.deleteMany({ where: { userId, postId } });
  },
  async listSavedIds(userId: string, cursor: string | undefined, take: number) {
    const rows = await prisma.savedPost.findMany({
      where: { userId },
      orderBy: [{ savedAt: "desc" }, { id: "desc" }],
      take: take + 1,
      select: { id: true, postId: true },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    return { items, hasMore, nextCursor: hasMore ? items[items.length - 1].id : null };
  },

  // ───────── reports ─────────
  findReport(reporterId: string, target: { postId?: string; commentId?: string }) {
    return prisma.contentReport.findFirst({ where: { reporterId, ...target }, select: { id: true } });
  },
  createReport(data: { reporterId: string; targetType: "POST" | "COMMENT"; postId?: string; commentId?: string; reason: string; details?: string }) {
    return prisma.contentReport.create({ data, select: { id: true } });
  },

  // ───────── discovery helpers ─────────
  /** Authors the viewer follows, among a set of candidate authors. */
  /** People who reacted to a post, newest first, optionally one reaction type. Blocked people are excluded in SQL. */
  async listReactors(input: { postId: string; hiddenIds: string[]; type?: ReactionType; cursor?: string; take: number }) {
    const { postId, hiddenIds, type, cursor, take } = input;
    const rows = await prisma.postReaction.findMany({
      where: { postId, userId: { notIn: hiddenIds }, ...(type ? { type } : {}) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, type: true, user: { select: AUTHOR_SELECT } },
    });
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    return { items, hasMore, nextCursor: hasMore ? items[items.length - 1].id : null };
  },

  async followedAmong(viewerId: string, authorIds: string[]): Promise<Set<string>> {
    if (authorIds.length === 0) return new Set();
    const rows = await prisma.follow.findMany({ where: { followerId: viewerId, targetType: "USER", targetId: { in: authorIds } }, select: { targetId: true } });
    return new Set(rows.map((r) => r.targetId));
  },
  /** Authors the viewer is connected with, among a set of candidate authors. */
  async connectedAmong(viewerId: string, authorIds: string[]): Promise<Set<string>> {
    if (authorIds.length === 0) return new Set();
    const rows = await prisma.connection.findMany({
      where: {
        status: "ACCEPTED",
        OR: [
          { requesterId: viewerId, addresseeId: { in: authorIds } },
          { addresseeId: viewerId, requesterId: { in: authorIds } },
        ],
      },
      select: { requesterId: true, addresseeId: true },
    });
    return new Set(rows.map((r) => (r.requesterId === viewerId ? r.addresseeId : r.requesterId)));
  },
  async skillsOf(userIds: string[]): Promise<Map<string, string[]>> {
    if (userIds.length === 0) return new Map();
    const rows = await prisma.userSkill.findMany({ where: { userId: { in: userIds } }, select: { userId: true, skill: { select: { name: true } } } });
    const map = new Map<string, string[]>();
    for (const r of rows) map.set(r.userId, [...(map.get(r.userId) ?? []), r.skill.name]);
    return map;
  },

  /** Public posts with the most engagement lately, for Featured. */
  topPublicPosts(sinceDays: number, hiddenIds: string[], take: number) {
    return prisma.post.findMany({
      where: { visibility: "PUBLIC", authorId: { notIn: hiddenIds }, createdAt: { gte: new Date(Date.now() - sinceDays * 86_400_000) }, sharedPostId: null },
      orderBy: [{ reactions: { _count: "desc" } }, { comments: { _count: "desc" } }, { createdAt: "desc" }],
      take,
      select: { id: true },
    });
  },

  searchPublic(query: string, hiddenIds: string[], take: number) {
    return prisma.post.findMany({
      where: { visibility: "PUBLIC", authorId: { notIn: hiddenIds }, OR: [{ content: { contains: query, mode: "insensitive" } }, { title: { contains: query, mode: "insensitive" } }] },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      select: { id: true },
    });
  },
};
