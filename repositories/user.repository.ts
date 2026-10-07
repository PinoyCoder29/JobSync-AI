import { prisma } from "@/lib/prisma";

export const userRepository = {
  /** Includes passwordHash – only for server-side credential checks. Never return this to the client. */
  findByEmailWithHash(email: string) {
    return prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true, passwordHash: true } });
  },
  findByIdWithHash(id: string) {
    return prisma.user.findUnique({ where: { id }, select: { id: true, passwordHash: true } });
  },
  findById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, createdAt: true } });
  },
  createWithProfile(data: { name: string; email: string; passwordHash: string }) {
    return prisma.user.create({
      data: { ...data, profile: { create: {} } },
      select: { id: true, name: true, email: true },
    });
  },
  /** Heartbeat write, throttled IN the query: at most one UPDATE per user per 30s no matter how many tabs/requests. */
  touchLastSeen(id: string) {
    return prisma.user.updateMany({ where: { id, OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: new Date(Date.now() - 30_000) } }] }, data: { lastSeenAt: new Date() } });
  },
  presenceRows(ids: string[]) {
    return prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, lastSeenAt: true, profile: { select: { showOnlineStatus: true } } } });
  },
  ensureProfile(userId: string) {
    return prisma.profile.upsert({ where: { userId }, create: { userId }, update: {}, select: { id: true } });
  },
  listAccounts(userId: string) {
    return prisma.account.findMany({ where: { userId }, select: { provider: true }, orderBy: { provider: "asc" } });
  },
  updatePassword(id: string, passwordHash: string) {
    return prisma.user.update({ where: { id }, data: { passwordHash }, select: { id: true } });
  },
  updateName(id: string, name: string) {
    return prisma.user.update({ where: { id }, data: { name }, select: { id: true } });
  },
};
