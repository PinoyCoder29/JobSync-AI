import type { NotificationType } from "@prisma/client";
import { getOptimizedUrl } from "@/lib/storage/cloudinary";
import { blockRepository } from "@/repositories/networking.repository";
import { notificationRepository, type NotificationRecord } from "@/repositories/notification.repository";
import type { NotificationDTO } from "./types";

const PAGE_SIZE = 20;

type PrefKey = "notifyReactions" | "notifyComments" | "notifyConnections" | "notifyMessages" | "notifyJobAlerts" | "notifyApplicationUpdates";
const PREFERENCE: Record<NotificationType, PrefKey> = {
  CONNECTION_REQUEST: "notifyConnections",
  CONNECTION_ACCEPTED: "notifyConnections",
  FOLLOWED: "notifyConnections",
  POST_REACTION: "notifyReactions",
  POST_SHARED: "notifyReactions",
  POST_COMMENT: "notifyComments",
  COMMENT_REPLY: "notifyComments",
  MENTION: "notifyComments",
  MESSAGE: "notifyMessages",
  JOB_RECOMMENDED: "notifyJobAlerts",
  JOB_ALERT_MATCH: "notifyJobAlerts",
  APPLICATION_STATUS: "notifyApplicationUpdates",
};

/** Noisy, repeatable actions only notify once until the previous one is read. A MESSAGE is deduped per conversation, so a burst of messages is one notification. */
const DEDUPED: ReadonlySet<NotificationType> = new Set(["POST_REACTION", "FOLLOWED", "CONNECTION_REQUEST", "MESSAGE"]);

export const NOTIFICATION_TEXT: Record<NotificationType, string> = {
  CONNECTION_REQUEST: "sent you a connection request",
  CONNECTION_ACCEPTED: "accepted your connection request",
  FOLLOWED: "started following you",
  POST_REACTION: "reacted to your post",
  POST_COMMENT: "commented on your post",
  COMMENT_REPLY: "replied to your comment",
  POST_SHARED: "shared your post",
  MENTION: "mentioned you",
  MESSAGE: "sent you a message",
  JOB_RECOMMENDED: "A new job matches your profile",
  JOB_ALERT_MATCH: "A new job matches one of your alerts",
  APPLICATION_STATUS: "Your application status changed",
};

export function notificationHref(n: { type: NotificationType; postId: string | null; jobId: string | null; actorId: string | null; conversationId?: string | null }): string {
  switch (n.type) {
    case "MESSAGE": return n.conversationId ? `/messages/${n.conversationId}` : "/messages";
    case "CONNECTION_REQUEST": return "/network?tab=requests";
    case "CONNECTION_ACCEPTED":
    case "FOLLOWED": return n.actorId ? `/people/${n.actorId}` : "/network";
    case "JOB_RECOMMENDED":
    case "JOB_ALERT_MATCH": return n.jobId ? `/jobs/${n.jobId}` : "/jobs";
    case "APPLICATION_STATUS": return "/applications";
    default: return n.postId ? `/posts/${n.postId}` : "/";
  }
}

function toDTO(n: NotificationRecord): NotificationDTO {
  const name = n.actor?.name?.trim() || "Someone";
  const avatar = n.actor?.profile?.avatarMedia?.url;
  const systemMessage = n.type === "JOB_RECOMMENDED" || n.type === "JOB_ALERT_MATCH" || n.type === "APPLICATION_STATUS";
  return {
    id: n.id,
    type: n.type,
    text: systemMessage ? NOTIFICATION_TEXT[n.type] : `${name} ${NOTIFICATION_TEXT[n.type]}`,
    href: notificationHref({ type: n.type, postId: n.postId, jobId: n.jobId, actorId: n.actor?.id ?? null, conversationId: n.conversationId }),
    actor: n.actor ? { id: n.actor.id, name, avatarUrl: avatar ? getOptimizedUrl(avatar, "avatarSm") : n.actor.image ?? null } : null,
    read: n.readAt !== null,
    createdAt: n.createdAt.toISOString(),
  };
}

export const notificationService = {
  /**
   * Fire-and-forget: a failed notification must never fail the action that caused it, so this never throws.
   * Skips: notifying yourself, blocked pairs, recipients who switched this kind off, and repeats of noisy actions.
   */
  async notify(input: { recipientId: string; actorId?: string; type: NotificationType; postId?: string; commentId?: string; jobId?: string; conversationId?: string }): Promise<void> {
    try {
      if (input.actorId && input.actorId === input.recipientId) return;
      if (input.actorId && (await blockRepository.isBlockedEitherWay(input.actorId, input.recipientId))) return;
      const prefs = await notificationRepository.preferences(input.recipientId);
      if (!prefs[PREFERENCE[input.type]]) return;
      if (DEDUPED.has(input.type) && (await notificationRepository.unreadDuplicate({ recipientId: input.recipientId, actorId: input.actorId, type: input.type, postId: input.postId, jobId: input.jobId, conversationId: input.conversationId }))) return;
      await notificationRepository.create(input);
    } catch (error) {
      console.error("Notification failed", input.type, error);
    }
  },

  async list(userId: string, cursor?: string) {
    const page = await notificationRepository.list(userId, cursor, PAGE_SIZE);
    return { items: page.items.map(toDTO), hasMore: page.hasMore, nextCursor: page.nextCursor };
  },

  unreadCount: (userId: string) => notificationRepository.unreadCount(userId),
  markAllRead: (userId: string) => notificationRepository.markAllRead(userId),
  markRead: (id: string, userId: string) => notificationRepository.markRead(id, userId),
};
