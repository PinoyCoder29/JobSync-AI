import { Prisma, type ConnectionStatus, type FollowTargetType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pairKeyFor } from "@/lib/permissions/network";

/** The only user fields the network UI is allowed to see. Never email, phone or password hash. */
export const PERSON_SELECT = {
  id: true,
  name: true,
  image: true,
  profile: {
    select: {
      headline: true,
      location: true,
      visibility: true,
      profileVisible: true,
      avatarMedia: { select: { url: true } },
    },
  },
} satisfies Prisma.UserSelect;

export type PersonRecord = Prisma.UserGetPayload<{ select: typeof PERSON_SELECT }>;

const CONNECTION_INCLUDE = {
  requester: { select: PERSON_SELECT },
  addressee: { select: PERSON_SELECT },
} satisfies Prisma.ConnectionInclude;

export type ConnectionRecord = Prisma.ConnectionGetPayload<{ include: typeof CONNECTION_INCLUDE }>;

export const connectionRepository = {
  findBetween(a: string, b: string) {
    return prisma.connection.findUnique({ where: { pairKey: pairKeyFor(a, b) } });
  },
  findById(id: string) {
    return prisma.connection.findUnique({ where: { id } });
  },

  /** Creates the request, or re-opens an old REJECTED/CANCELLED row for the same pair. The service decides when that is allowed. */
  upsertRequest(requesterId: string, addresseeId: string, message?: string) {
    return prisma.connection.upsert({
      where: { pairKey: pairKeyFor(requesterId, addresseeId) },
      create: { requesterId, addresseeId, pairKey: pairKeyFor(requesterId, addresseeId), message },
      update: { requesterId, addresseeId, status: "PENDING", message: message ?? null, respondedAt: null },
    });
  },

  /** Compare-and-set: only changes the row if it is still in `from`, so double clicks and races cannot double-apply. */
  async transition(id: string, from: ConnectionStatus, to: ConnectionStatus): Promise<boolean> {
    const result = await prisma.connection.updateMany({ where: { id, status: from }, data: { status: to, respondedAt: new Date() } });
    return result.count === 1;
  },

  async removeAccepted(a: string, b: string): Promise<boolean> {
    const result = await prisma.connection.deleteMany({ where: { pairKey: pairKeyFor(a, b), status: "ACCEPTED" } });
    return result.count === 1;
  },

  /** Accepted connections, newest first, cursor paginated. */
  async listAccepted(userId: string, cursor: string | undefined, take: number) {
    const rows = await prisma.connection.findMany({
      where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] },
      include: CONNECTION_INCLUDE,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    return paginate(rows, take);
  },

  listIncoming(userId: string, take = 50) {
    return prisma.connection.findMany({ where: { addresseeId: userId, status: "PENDING" }, include: CONNECTION_INCLUDE, orderBy: { createdAt: "desc" }, take });
  },
  listOutgoing(userId: string, take = 50) {
    return prisma.connection.findMany({ where: { requesterId: userId, status: "PENDING" }, include: CONNECTION_INCLUDE, orderBy: { createdAt: "desc" }, take });
  },

  /** Ids to keep out of suggestions: everyone already connected or with a request in flight. */
  async engagedUserIds(userId: string): Promise<Set<string>> {
    const rows = await prisma.connection.findMany({
      where: { status: { in: ["ACCEPTED", "PENDING"] }, OR: [{ requesterId: userId }, { addresseeId: userId }] },
      select: { requesterId: true, addresseeId: true },
    });
    return new Set(rows.flatMap((r) => [r.requesterId, r.addresseeId]).filter((id) => id !== userId));
  },

  countAccepted(userId: string) {
    return prisma.connection.count({ where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] } });
  },
  countIncoming(userId: string) {
    return prisma.connection.count({ where: { addresseeId: userId, status: "PENDING" } });
  },
};

export const followRepository = {
  follow(followerId: string, targetType: FollowTargetType, targetId: string) {
    return prisma.follow.upsert({
      where: { followerId_targetType_targetId: { followerId, targetType, targetId } },
      create: { followerId, targetType, targetId },
      update: {},
    });
  },
  unfollow(followerId: string, targetType: FollowTargetType, targetId: string) {
    return prisma.follow.deleteMany({ where: { followerId, targetType, targetId } });
  },
  async isFollowing(followerId: string, targetType: FollowTargetType, targetId: string) {
    return (await prisma.follow.count({ where: { followerId, targetType, targetId } })) > 0;
  },
  countFollowers(targetType: FollowTargetType, targetId: string) {
    return prisma.follow.count({ where: { targetType, targetId } });
  },
  countFollowing(followerId: string) {
    return prisma.follow.count({ where: { followerId } });
  },
  /** People the user follows, newest first, cursor paginated. */
  async listFollowingUsers(followerId: string, cursor: string | undefined, take: number) {
    const rows = await prisma.follow.findMany({
      where: { followerId, targetType: "USER" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const page = paginate(rows, take);
    const users = await prisma.user.findMany({ where: { id: { in: page.items.map((r) => r.targetId) } }, select: PERSON_SELECT });
    const byId = new Map(users.map((u) => [u.id, u]));
    return {
      ...page,
      items: page.items.flatMap((r) => (byId.has(r.targetId) ? [{ followId: r.id, person: byId.get(r.targetId)! }] : [])),
    };
  },
  deleteBetweenUsers(a: string, b: string, tx: Prisma.TransactionClient = prisma) {
    return tx.follow.deleteMany({
      where: { targetType: "USER", OR: [{ followerId: a, targetId: b }, { followerId: b, targetId: a }] },
    });
  },
};

export const blockRepository = {
  /** Blocks `blockedId` and, in the same transaction, removes any connection and follows between the two people. */
  async block(blockerId: string, blockedId: string) {
    await prisma.$transaction([
      prisma.block.upsert({ where: { blockerId_blockedId: { blockerId, blockedId } }, create: { blockerId, blockedId }, update: {} }),
      prisma.connection.deleteMany({ where: { pairKey: pairKeyFor(blockerId, blockedId) } }),
      prisma.follow.deleteMany({ where: { targetType: "USER", OR: [{ followerId: blockerId, targetId: blockedId }, { followerId: blockedId, targetId: blockerId }] } }),
    ]);
  },
  unblock(blockerId: string, blockedId: string) {
    return prisma.block.deleteMany({ where: { blockerId, blockedId } });
  },
  async isBlockedByMe(blockerId: string, blockedId: string) {
    return (await prisma.block.count({ where: { blockerId, blockedId } })) > 0;
  },
  /** True when EITHER person has blocked the other. */
  async isBlockedEitherWay(a: string, b: string) {
    return (await prisma.block.count({ where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] } })) > 0;
  },
  /** Everyone who is blocked by, or has blocked, this user. Use to filter search, feed, suggestions, messaging. */
  async hiddenUserIds(userId: string): Promise<Set<string>> {
    const rows = await prisma.block.findMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] }, select: { blockerId: true, blockedId: true } });
    return new Set(rows.flatMap((r) => [r.blockerId, r.blockedId]).filter((id) => id !== userId));
  },
  async listBlockedUsers(blockerId: string, take = 100) {
    const rows = await prisma.block.findMany({ where: { blockerId }, orderBy: { createdAt: "desc" }, take, include: { blocked: { select: PERSON_SELECT } } });
    return rows.map((r) => r.blocked);
  },
};

export const discoveryRepository = {
  /** Public, discoverable people for suggestions. Skills are fetched in the same query (no N+1). */
  findCandidates(excludeIds: string[], limit: number) {
    return prisma.user.findMany({
      where: { id: { notIn: excludeIds }, profile: { is: { visibility: "PUBLIC", profileVisible: true } } },
      select: { ...PERSON_SELECT, profile: { select: { ...PERSON_SELECT.profile.select, targetRoles: true } }, skills: { select: { skill: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },
  viewerSignals(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { profile: { select: { targetRoles: true, location: true } }, skills: { select: { skill: { select: { name: true } } } } },
    });
  },
  /** Card data for specific people (admin-picked Featured). Visibility is applied by the caller. */
  findCards(ids: string[]) {
    return prisma.user.findMany({ where: { id: { in: ids } }, select: PERSON_SELECT });
  },
  /** Public, discoverable people matching a text query (name, headline or skill). */
  searchPeople(query: string, excludeIds: string[], take: number) {
    const ci = { contains: query, mode: "insensitive" as const };
    return prisma.user.findMany({
      where: {
        id: { notIn: excludeIds },
        profile: { is: { visibility: "PUBLIC", profileVisible: true } },
        OR: [{ name: ci }, { profile: { is: { headline: ci } } }, { skills: { some: { skill: { name: ci } } } }],
      },
      select: PERSON_SELECT,
      orderBy: { createdAt: "desc" },
      take,
    });
  },
  /** Minimal fields needed to decide whether someone can be connected with, followed or viewed. */
  findAccessInfo(id: string) {
    return prisma.user.findUnique({ where: { id }, select: { id: true, profile: { select: { visibility: true, profileVisible: true } } } });
  },
  findPerson(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        ...PERSON_SELECT,
        profile: {
          select: {
            ...PERSON_SELECT.profile.select,
            summary: true,
            targetRoles: true,
            portfolioUrl: true,
            githubUrl: true,
            linkedinUrl: true,
            coverMedia: { select: { url: true } },
          },
        },
        skills: { select: { level: true, skill: { select: { name: true } } }, orderBy: { level: "desc" }, take: 30 },
      },
    });
  },
};

function paginate<T extends { id: string }>(rows: T[], take: number) {
  const hasMore = rows.length > take;
  const items = hasMore ? rows.slice(0, take) : rows;
  return { items, hasMore, nextCursor: hasMore ? items[items.length - 1].id : null };
}
