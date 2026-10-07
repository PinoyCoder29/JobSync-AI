import { Prisma, type ReactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pairKeyFor } from "@/lib/permissions/network";
import { PERSON_SELECT } from "./networking.repository";

/** What a viewer may see of a message. `hiddenFor` is filtered per viewer ("delete for me"), see notHiddenFor(). */
const messageSelect = (viewerId: string) =>
  ({
    id: true,
    conversationId: true,
    senderId: true,
    content: true,
    clientId: true,
    createdAt: true,
    editedAt: true,
    readAt: true,
    deletedAt: true,
    replyTo: { select: { id: true, content: true, senderId: true, deletedAt: true } },
    reactions: { select: { userId: true, type: true } },
    // not selected for display; present so the type stays honest about the per-viewer filter
    hiddenFor: { where: { userId: viewerId }, select: { id: true }, take: 1 },
  }) satisfies Prisma.MessageSelect;

export type MessageRecord = Prisma.MessageGetPayload<{ select: ReturnType<typeof messageSelect> }>;

/** "Delete for me" is a row in MessageHidden. These hide it from ONE person without touching the message. */
const notHiddenFor = (userId: string): Prisma.MessageWhereInput => ({ hiddenFor: { none: { userId } } });

const PARTICIPANTS = { select: { userId: true, user: { select: PERSON_SELECT } } } satisfies { select: Prisma.ConversationParticipantSelect };

const CONVERSATION_SELECT = {
  id: true,
  lastMessageAt: true,
  participants: PARTICIPANTS,
} satisfies Prisma.ConversationSelect;

export type ConversationRecord = Prisma.ConversationGetPayload<{ select: typeof CONVERSATION_SELECT }>;

/** Messages the user has not opened yet: written by someone else, still unread, not deleted, not hidden by them. */
const unreadWhere = (userId: string): Prisma.MessageWhereInput => ({ senderId: { not: userId }, readAt: null, deletedAt: null, ...notHiddenFor(userId) });

export const conversationRepository = {
  findByPairKey(a: string, b: string) {
    return prisma.conversation.findUnique({ where: { pairKey: pairKeyFor(a, b) }, select: { id: true } });
  },

  /** Returns the conversation only when `userId` is one of its participants. This is the access check for everything below. */
  findForParticipant(conversationId: string, userId: string): Promise<ConversationRecord | null> {
    return prisma.conversation.findFirst({ where: { id: conversationId, participants: { some: { userId } } }, select: CONVERSATION_SELECT });
  },

  /** One conversation per pair. The unique pairKey makes this race-safe. */
  async findOrCreate(a: string, b: string): Promise<{ id: string }> {
    const pairKey = pairKeyFor(a, b);
    const existing = await prisma.conversation.findUnique({ where: { pairKey }, select: { id: true } });
    if (existing) return existing;
    try {
      return await prisma.conversation.create({ data: { pairKey, participants: { create: [{ userId: a }, { userId: b }] } }, select: { id: true } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const winner = await prisma.conversation.findUnique({ where: { pairKey }, select: { id: true } });
        if (winner) return winner;
      }
      throw error;
    }
  },

  /** Conversations with at least one message, newest activity first. Blocked people are excluded. */
  async listForUser(userId: string, hiddenUserIds: string[], take: number) {
    return prisma.conversation.findMany({
      where: {
        lastMessageAt: { not: null },
        participants: { some: { userId } },
        ...(hiddenUserIds.length ? { NOT: { participants: { some: { userId: { in: hiddenUserIds } } } } } : {}),
      },
      orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
      take,
      select: {
        ...CONVERSATION_SELECT,
        // the preview skips messages the viewer deleted "for me"
        messages: { where: notHiddenFor(userId), orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1, select: messageSelect(userId) },
        _count: { select: { messages: { where: unreadWhere(userId) } } },
      },
    });
  },
};

export type ConversationListRecord = Awaited<ReturnType<typeof conversationRepository.listForUser>>[number];

export const messageRepository = {
  findByClientId(senderId: string, clientId: string) {
    return prisma.message.findUnique({ where: { senderId_clientId: { senderId, clientId } }, select: messageSelect(senderId) });
  },

  /** A message, but only if `userId` is a participant of its conversation (the access check for react/edit/delete). */
  findForParticipant(id: string, userId: string) {
    return prisma.message.findFirst({
      where: { id, conversation: { participants: { some: { userId } } } },
      select: { id: true, senderId: true, conversationId: true, deletedAt: true },
    });
  },

  /** Does `id` belong to this conversation? (a reply can only point inside its own conversation) */
  inConversation(id: string, conversationId: string) {
    return prisma.message.findFirst({ where: { id, conversationId }, select: { id: true } });
  },

  /** Saves the message and bumps the conversation's activity time in ONE transaction. */
  create(data: { conversationId: string; senderId: string; content: string; clientId?: string; replyToId?: string }): Promise<MessageRecord> {
    return prisma.$transaction(async (tx) => {
      const message = await tx.message.create({ data, select: messageSelect(data.senderId) });
      await tx.conversation.update({ where: { id: data.conversationId }, data: { lastMessageAt: message.createdAt }, select: { id: true } });
      return message;
    });
  },

  byId(id: string, viewerId: string) {
    return prisma.message.findUnique({ where: { id }, select: messageSelect(viewerId) });
  },

  /** One page, newest first (the service reverses it). Messages the viewer deleted "for me" never appear. */
  async page(conversationId: string, viewerId: string, take: number, before?: string): Promise<{ rows: MessageRecord[]; hasMore: boolean } | null> {
    let cursorWhere: Prisma.MessageWhereInput = {};
    if (before) {
      const anchor = await prisma.message.findFirst({ where: { id: before, conversationId }, select: { id: true, createdAt: true } });
      if (!anchor) return null;
      cursorWhere = { OR: [{ createdAt: { lt: anchor.createdAt } }, { createdAt: anchor.createdAt, id: { lt: anchor.id } }] };
    }
    const rows = await prisma.message.findMany({
      where: { conversationId, ...notHiddenFor(viewerId), ...cursorWhere },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      select: messageSelect(viewerId),
    });
    const hasMore = rows.length > take;
    return { rows: hasMore ? rows.slice(0, take) : rows, hasMore };
  },

  async markRead(conversationId: string, readerId: string): Promise<number> {
    const result = await prisma.message.updateMany({ where: { conversationId, senderId: { not: readerId }, readAt: null }, data: { readAt: new Date() } });
    return result.count;
  },

  /** senderId in the WHERE = nobody can edit someone else's message. Deleted messages can't be edited. */
  async edit(id: string, senderId: string, content: string): Promise<boolean> {
    const r = await prisma.message.updateMany({ where: { id, senderId, deletedAt: null }, data: { content, editedAt: new Date() } });
    return r.count === 1;
  },

  /** "Delete for everyone": content erased, reactions removed, the placeholder stays so the timeline keeps its shape. */
  async deleteForEveryone(id: string, senderId: string): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const r = await tx.message.updateMany({ where: { id, senderId, deletedAt: null }, data: { deletedAt: new Date(), content: "" } });
      if (r.count === 1) await tx.messageReaction.deleteMany({ where: { messageId: id } });
      return r.count === 1;
    });
  },

  /** "Delete for me": hide it for this one person. The other participant is unaffected. */
  async hideForUser(messageId: string, userId: string): Promise<void> {
    await prisma.messageHidden.createMany({ data: [{ messageId, userId }], skipDuplicates: true });
  },

  setReaction(messageId: string, userId: string, type: ReactionType) {
    return prisma.messageReaction.upsert({ where: { messageId_userId: { messageId, userId } }, create: { messageId, userId, type }, update: { type } });
  },
  removeReaction(messageId: string, userId: string) {
    return prisma.messageReaction.deleteMany({ where: { messageId, userId } });
  },

  /** Unread messages across all of the user's conversations, ignoring blocked people. */
  unreadTotal(userId: string, hiddenUserIds: string[]) {
    return prisma.message.count({
      where: {
        ...unreadWhere(userId),
        ...(hiddenUserIds.length ? { senderId: { not: userId, notIn: hiddenUserIds } } : {}),
        conversation: { participants: { some: { userId } } },
      },
    });
  },
};
