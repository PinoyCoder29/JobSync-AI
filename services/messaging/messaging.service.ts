import type { ProfileVisibility, ReactionType } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { canDeleteMessage, canMessageUser, messagingDeniedReason } from "@/lib/permissions/messaging";
import { effectiveVisibility } from "@/lib/permissions/profile";
import { enforceRateLimit } from "@/lib/rate-limit";
import { previewText } from "@/lib/messaging/thread";
import { HIDDEN_PRESENCE, type PresenceDTO } from "@/lib/presence";
import {
  conversationRepository,
  messageRepository,
  type ConversationListRecord,
  type ConversationRecord,
  type MessageRecord,
} from "@/repositories/message.repository";
import {
  blockRepository,
  connectionRepository,
  discoveryRepository,
  type PersonRecord,
} from "@/repositories/networking.repository";
import { notificationRepository } from "@/repositories/notification.repository";
import { presenceService } from "@/services/presence.service";
import { toCard } from "@/services/networking.service";
import { notificationService } from "@/services/social/notification.service";
import type {
  ConversationDetailDTO,
  ConversationPersonDTO,
  ConversationSummaryDTO,
  MessageDTO,
  MessagePageDTO,
  UnreadCountsDTO,
} from "./types";

const NOT_FOUND = "We couldn't find that conversation.";
const LIST_LIMIT = 50;
const DEFAULT_PAGE = 30;

// ───────── Mappers ─────────

const toPerson = (person: PersonRecord, presence: PresenceDTO = HIDDEN_PRESENCE): ConversationPersonDTO => {
  const card = toCard(person);
  return { id: card.id, name: card.name, headline: card.headline, avatarUrl: card.avatarUrl, presence };
};

/** `mine`, `clientId` and "my reaction" are derived from the SESSION user, never from anything the client sent. */
function toMessageDTO(m: MessageRecord, viewerId: string): MessageDTO {
  const mine = m.senderId === viewerId;
  const deleted = m.deletedAt !== null;
  const counts = new Map<ReactionType, { count: number; mine: boolean }>();
  if (!deleted) {
    for (const r of m.reactions) {
      const c = counts.get(r.type) ?? { count: 0, mine: false };
      counts.set(r.type, { count: c.count + 1, mine: c.mine || r.userId === viewerId });
    }
  }
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    mine,
    content: deleted ? "" : m.content,
    createdAt: m.createdAt.toISOString(),
    editedAt: !deleted && m.editedAt ? m.editedAt.toISOString() : null,
    replyTo: !deleted && m.replyTo ? { id: m.replyTo.id, preview: m.replyTo.deletedAt ? "" : previewText(m.replyTo.content, 120), mine: m.replyTo.senderId === viewerId, deleted: m.replyTo.deletedAt !== null } : null,
    reactions: [...counts].map(([type, v]) => ({ type, count: v.count, mine: v.mine })),
    readAt: m.readAt?.toISOString() ?? null,
    deleted,
    clientId: mine ? m.clientId : null,
  };
}

function toSummary(row: ConversationListRecord, viewerId: string, presence: Map<string, PresenceDTO>): ConversationSummaryDTO | null {
  const other = row.participants.find((p) => p.userId !== viewerId);
  if (!other) return null; // the other person's account no longer exists
  const last = row.messages[0] ?? null;
  return {
    id: row.id,
    person: toPerson(other.user, presence.get(other.userId)),
    lastMessage: last
      ? { preview: last.deletedAt ? "" : previewText(last.content), createdAt: last.createdAt.toISOString(), mine: last.senderId === viewerId, deleted: last.deletedAt !== null }
      : null,
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
    unread: row._count.messages,
  };
}

// ───────── Access ─────────

/**
 * The single gate for reading or writing a conversation.
 *  - you must be a participant,
 *  - the other person must still exist,
 *  - a block in EITHER direction makes the conversation look like it doesn't exist (blocking is never revealed).
 */
async function loadConversation(userId: string, conversationId: string): Promise<{ conversation: ConversationRecord; other: PersonRecord }> {
  const conversation = await conversationRepository.findForParticipant(conversationId, userId);
  const other = conversation?.participants.find((p) => p.userId !== userId)?.user;
  if (!conversation || !other) throw new AppError(NOT_FOUND, "NOT_FOUND");
  if (await blockRepository.isBlockedEitherWay(userId, other.id)) throw new AppError(NOT_FOUND, "NOT_FOUND");
  return { conversation, other };
}

/** Whether `userId` may send NEW messages to this person right now (history is always readable by participants). */
type AccessSubject = { id: string; name?: string | null; profile: { visibility: ProfileVisibility; profileVisible: boolean } | null };

async function sendAccess(userId: string, other: AccessSubject) {
  const connection = await connectionRepository.findBetween(userId, other.id);
  const visibility = effectiveVisibility(other.profile);
  const allowed = canMessageUser({ senderId: userId, recipientId: other.id, recipientVisibility: visibility, connected: connection?.status === "ACCEPTED", blocked: false });
  const name = other.name?.trim() || "This person";
  return { allowed, reason: allowed ? null : messagingDeniedReason(name, visibility) };
}

/** Loads one page. Callers must have passed loadConversation() first. */
async function pageOf(userId: string, conversationId: string, opts: { before?: string; limit?: number }): Promise<MessagePageDTO> {
  const page = await messageRepository.page(conversationId, userId, opts.limit ?? DEFAULT_PAGE, opts.before);
  if (!page) throw new AppError("That part of the conversation isn't available.", "NOT_FOUND");
  const items = page.rows.map((m) => toMessageDTO(m, userId)).reverse();
  return { items, hasMore: page.hasMore, nextCursor: page.hasMore ? items[0]?.id ?? null : null };
}

// ───────── Service ─────────

export const messagingService = {
  /**
   * Profile -> Message. Opens the existing conversation with this person, or creates it.
   * Existing history can always be reopened; a NEW conversation needs the privacy rules to allow it.
   */
  async start(userId: string, targetId: string): Promise<{ conversationId: string }> {
    if (userId === targetId) throw new AppError("You can't message yourself.");
    const target = await discoveryRepository.findAccessInfo(targetId);
    // Same answer for "doesn't exist" and "blocked you": blocks are never revealed.
    if (!target || (await blockRepository.isBlockedEitherWay(userId, targetId))) throw new AppError("We couldn't find that person.", "NOT_FOUND");

    const existing = await conversationRepository.findByPairKey(userId, targetId);
    if (existing) return { conversationId: existing.id };

    const access = await sendAccess(userId, target);
    if (!access.allowed) throw new AppError(access.reason ?? "You can't message this person.", "FORBIDDEN");

    enforceRateLimit(userId, "startConversation");
    const { id } = await conversationRepository.findOrCreate(userId, targetId);
    return { conversationId: id };
  },

  /** The inbox: conversations with at least one message, newest first. Blocked people are left out. */
  async list(userId: string): Promise<ConversationSummaryDTO[]> {
    const hidden = await blockRepository.hiddenUserIds(userId);
    const rows = await conversationRepository.listForUser(userId, [...hidden], LIST_LIMIT);
    const presence = await presenceService.forViewer(userId, rows.flatMap((r) => r.participants.filter((p) => p.userId !== userId).map((p) => p.userId)));
    return rows.flatMap((row) => {
      const summary = toSummary(row, userId, presence);
      return summary ? [summary] : [];
    });
  },

  /** One conversation plus its most recent messages. Throws NOT_FOUND for anyone who is not a participant. */
  async get(userId: string, conversationId: string, limit = DEFAULT_PAGE): Promise<{ conversation: ConversationDetailDTO; messages: MessagePageDTO }> {
    const { conversation, other } = await loadConversation(userId, conversationId);
    const [access, messages, presence] = await Promise.all([sendAccess(userId, other), pageOf(userId, conversation.id, { limit }), presenceService.forViewer(userId, [other.id])]);
    return {
      conversation: { id: conversation.id, person: toPerson(other, presence.get(other.id)), canSend: access.allowed, sendBlockedReason: access.reason },
      messages,
    };
  },

  /** A page of messages, oldest -> newest. Pass `before` (a message id) to load older history. */
  async messages(userId: string, conversationId: string, opts: { before?: string; limit?: number } = {}): Promise<MessagePageDTO> {
    const { conversation } = await loadConversation(userId, conversationId);
    return pageOf(userId, conversation.id, opts);
  },

  /** Save a message from the SIGNED-IN user and notify the other person. The sender is never taken from the client. */
  async send(userId: string, conversationId: string, input: { content: string; clientId?: string; replyToId?: string }): Promise<MessageDTO> {
    const { conversation, other } = await loadConversation(userId, conversationId);

    const access = await sendAccess(userId, other);
    if (!access.allowed) throw new AppError(access.reason ?? "You can't message this person right now.", "FORBIDDEN");

    // A retry of a message that was already saved returns the saved copy: no duplicate, and it doesn't use up the rate limit.
    let clientId = input.clientId;
    if (clientId) {
      const saved = await messageRepository.findByClientId(userId, clientId);
      if (saved && saved.conversationId === conversation.id) return toMessageDTO(saved, userId);
      if (saved) clientId = undefined; // that id was used in another conversation: save this one without it
    }

    // a reply may only quote a message from THIS conversation
    if (input.replyToId && !(await messageRepository.inConversation(input.replyToId, conversation.id))) throw new AppError("The message you're replying to isn't available.", "NOT_FOUND");

    enforceRateLimit(userId, "sendMessageBurst");
    enforceRateLimit(userId, "sendMessage");

    const message = await messageRepository.create({ conversationId: conversation.id, senderId: userId, content: input.content, clientId, replyToId: input.replyToId });
    // notify() never throws; awaited so the notification exists by the time the sender sees "sent".
    await notificationService.notify({ recipientId: other.id, actorId: userId, type: "MESSAGE", conversationId: conversation.id });
    return toMessageDTO(message, userId);
  },

  /** Opening a conversation: marks what the other person sent as read and clears its notification. */
  async markRead(userId: string, conversationId: string): Promise<UnreadCountsDTO> {
    const { conversation } = await loadConversation(userId, conversationId);
    await Promise.all([messageRepository.markRead(conversation.id, userId), notificationRepository.markConversationRead(userId, conversation.id)]);
    return this.unreadCounts(userId);
  },

  // ───────── Per-message actions ─────────

  /** A message the user may act on: they are a participant, the pair isn't blocked, and it still exists. */
  async _actionable(userId: string, messageId: string) {
    const m = await messageRepository.findForParticipant(messageId, userId);
    if (!m) throw new AppError("We couldn't find that message.", "NOT_FOUND");
    await loadConversation(userId, m.conversationId); // participant + block check
    return m;
  },

  /** React to a message (or pass null to remove your reaction). One reaction per person per message. */
  async react(userId: string, messageId: string, type: ReactionType | null): Promise<MessageDTO> {
    const m = await this._actionable(userId, messageId);
    if (m.deletedAt) throw new AppError("This message was deleted.", "NOT_FOUND");
    enforceRateLimit(userId, "reaction");
    if (type) await messageRepository.setReaction(messageId, userId, type);
    else await messageRepository.removeReaction(messageId, userId);
    return this._dto(userId, messageId);
  },

  /** Edit your OWN message. The WHERE clause in the repository enforces ownership a second time. */
  async edit(userId: string, messageId: string, content: string): Promise<MessageDTO> {
    const m = await this._actionable(userId, messageId);
    if (m.senderId !== userId) throw new AppError("You can only edit your own messages.", "FORBIDDEN");
    if (m.deletedAt) throw new AppError("A deleted message can't be edited.", "NOT_FOUND");
    enforceRateLimit(userId, "messageEdit");
    if (!(await messageRepository.edit(messageId, userId, content))) throw new AppError("We couldn't edit that message.", "NOT_FOUND");
    return this._dto(userId, messageId);
  },

  /** "Delete for me": hidden from YOUR view only. The other person keeps it. Works on any message you can see. */
  async deleteForMe(userId: string, messageId: string): Promise<{ id: string }> {
    const m = await messageRepository.findForParticipant(messageId, userId);
    if (!m) throw new AppError("We couldn't find that message.", "NOT_FOUND");
    await messageRepository.hideForUser(messageId, userId);
    return { id: messageId };
  },

  /** "Delete for everyone": SENDER ONLY. Content is erased for both people; a "This message was deleted" placeholder remains. */
  async deleteForEveryone(userId: string, messageId: string): Promise<{ id: string }> {
    const m = await messageRepository.findForParticipant(messageId, userId);
    if (!m) throw new AppError("We couldn't find that message.", "NOT_FOUND");
    if (!canDeleteMessage(userId, m)) throw new AppError(m.senderId === userId ? "That message was already deleted." : "You can only delete your own messages for everyone.", m.senderId === userId ? "NOT_FOUND" : "FORBIDDEN");
    if (!(await messageRepository.deleteForEveryone(messageId, userId))) throw new AppError("We couldn't find that message.", "NOT_FOUND");
    return { id: messageId };
  },

  async _dto(userId: string, messageId: string): Promise<MessageDTO> {
    const row = await messageRepository.byId(messageId, userId);
    if (!row) throw new AppError("We couldn't find that message.", "NOT_FOUND");
    return toMessageDTO(row, userId);
  },

  /** Presence of the other person in a conversation, after the privacy switch. */
  async presence(userId: string, conversationId: string): Promise<PresenceDTO> {
    const { other } = await loadConversation(userId, conversationId);
    return (await presenceService.forViewer(userId, [other.id])).get(other.id) ?? HIDDEN_PRESENCE;
  },

  async unreadMessages(userId: string): Promise<number> {
    return messageRepository.unreadTotal(userId, [...(await blockRepository.hiddenUserIds(userId))]);
  },

  async unreadCounts(userId: string): Promise<UnreadCountsDTO> {
    const [notifications, messages] = await Promise.all([notificationService.unreadCount(userId), this.unreadMessages(userId)]);
    return { notifications, messages };
  },
};
