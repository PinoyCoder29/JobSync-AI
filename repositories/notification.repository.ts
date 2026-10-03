import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const SELECT = {
  id: true,
  type: true,
  postId: true,
  commentId: true,
  jobId: true,
  readAt: true,
  createdAt: true,
  actor: { select: { id: true, name: true, image: true, profile: { select: { avatarMedia: { select: { url: true } } } } } },
} satisfies Prisma.NotificationSelect;

export type NotificationRecord = Prisma.NotificationGetPayload<{ select: typeof SELECT }>;

export const notificationRepository = {
  create(data: { recipientId: string; actorId?: string; type: NotificationType; postId?: string; commentId?: string; jobId?: string }) {
    return prisma.notification.create({ data, select: { id: true } });
  },

  /** True when the same actor already has an UNREAD notification of this kind for this thing (prevents spam). */
  async unreadDuplicate(data: { recipientId: string; actorId?: string; type: NotificationType; postId?: string; jobId?: string }) {
    return (await prisma.notification.count({ where: { ...data, readAt: null } })) > 0;
  },

  async list(recipientId: string, cursor: string | undefined, take: number) {
    const rows = await prisma.notification.findMany({
      where: { recipientId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      select: SELECT,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    return { items, hasMore, nextCursor: hasMore ? items[items.length - 1].id : null };
  },

  unreadCount(recipientId: string) {
    return prisma.notification.count({ where: { recipientId, readAt: null } });
  },

  async markAllRead(recipientId: string) {
    await prisma.notification.updateMany({ where: { recipientId, readAt: null }, data: { readAt: new Date() } });
  },
  /** recipientId in the filter means nobody can mark someone else's notification. */
  async markRead(id: string, recipientId: string) {
    await prisma.notification.updateMany({ where: { id, recipientId, readAt: null }, data: { readAt: new Date() } });
  },

  /** Delivery preferences for the recipient (missing profile = defaults on). */
  async preferences(userId: string) {
    const p = await prisma.profile.findUnique({
      where: { userId },
      select: { notifyReactions: true, notifyComments: true, notifyConnections: true, notifyJobAlerts: true, notifyApplicationUpdates: true },
    });
    return p ?? { notifyReactions: true, notifyComments: true, notifyConnections: true, notifyJobAlerts: true, notifyApplicationUpdates: true };
  },
};
