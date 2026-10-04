import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pairKeyFor } from "@/lib/permissions/network";
import { PERSON_SELECT } from "./networking.repository";

const MESSAGE_SELECT = {
  id: true,
  conversationId: true,
  senderId: true,
  content: true,
  clientId: true,
  createdAt: true,
  readAt: true,
  deletedAt: true,
} satisfies Prisma.MessageSelect;

export type MessageRecord = Prisma.MessageGetPayload<{ select: typeof MESSAGE_SELECT }>;

const PARTICIPANTS = { select: { userId: true, user: { select: PERSON_SELECT } } } satisfies { select: Prisma.ConversationParticipantSelect };

const CONVERSATION_SELECT = {
  id: true,
  lastMessageAt: true,
  participants: PARTICIPANTS,
} satisfies Prisma.ConversationSelect;

export type ConversationRecord = Prisma.ConversationGetPayload<{ select: typeof CONVERSATION_SELECT }>;

/** Messages the user has not opened yet: written by someone else, still unread, not deleted. */
const unreadWhere = (userId: string): Prisma.MessageWhereInput => ({ senderId: { not: userId }, readAt: null, deletedAt: null });

export const conversationRepository = {
  findByPairKey(a: string, b: string) {
    return prisma.conversation.findUnique({ where: { pairKey: pairKeyFor(a, b) }, select: { id: true } });
  },

  /** Returns the conversation only when `userId` is one of its participants. This is the access check for everything below. */
  findForParticipant(conversationId: string, userId: string): Promise<ConversationRecord | null> {
    return prisma.conversation.findFirst({ where: { id: conversationId, participants: { some: { userId } } }, select: CONVERSATION_SELECT });
  },

  /**
   * One conversation per pair. The unique pairKey makes this race-safe: if two requests create it at the same time,
   * the loser hits the unique constraint and simply reads the winner's row.
   */
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

  /** Conversations with at least one message, newest activity first. People who are blocked (either way) are excluded. */
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
        messages: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1, select: MESSAGE_SELECT },
        _count: { select: { messages: { where: unreadWhere(userId) } } },
      },
    });
  },

  async unreadFor(conversationId: string, userId: string) {
    return prisma.message.count({ where: { conversationId, ...unreadWhere(userId) } });
  },
};

export type ConversationListRecord = Awaited<ReturnType<typeof conversationRepository.listForUser>>[number];

export const messageRepository = {
  findByClientId(senderId: string, clientId: string) {
    return prisma.message.findUnique({ where: { senderId_clientId: { senderId, clientId } }, select: MESSAGE_SELECT });
  },

  findById(id: string) {
    return prisma.message.findUnique({ where: { id }, select: { id: true, senderId: true, conversationId: true, deletedAt: true } });
  },

  /** Saves the message and bumps the conversation's activity time in ONE transaction. */
  create(data: { conversationId: string; senderId: string; content: string; clientId?: string }): Promise<MessageRecord> {
    return prisma.$transaction(async (tx) => {
      const message = await tx.message.create({ data, select: MESSAGE_SELECT });
      await tx.conversation.update({ where: { id: data.conversationId }, data: { lastMessageAt: message.createdAt }, select: { id: true } });
      return message;
    });
  },

  /**
   * One page of messages, newest first (the service reverses it for display).
   * `before` must be a message of THIS conversation; the lookup is scoped by conversationId so ids from other chats are useless.
   */
  async page(conversationId: string, take: number, before?: string): Promise<{ rows: MessageRecord[]; hasMore: boolean } | null> {
    let cursorWhere: Prisma.MessageWhereInput = {};
    if (before) {
      const anchor = await prisma.message.findFirst({ where: { id: before, conversationId }, select: { id: true, createdAt: true } });
      if (!anchor) return null;
      cursorWhere = { OR: [{ createdAt: { lt: anchor.createdAt } }, { createdAt: anchor.createdAt, id: { lt: anchor.id } }] };
    }
    const rows = await prisma.message.findMany({
      where: { conversationId, ...cursorWhere },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      select: MESSAGE_SELECT,
    });
    const hasMore = rows.length > take;
    return { rows: hasMore ? rows.slice(0, take) : rows, hasMore };
  },

  /** Marks everything the OTHER person sent as read. Your own messages are never touched. */
  async markRead(conversationId: string, readerId: string): Promise<number> {
    const result = await prisma.message.updateMany({ where: { conversationId, senderId: { not: readerId }, readAt: null }, data: { readAt: new Date() } });
    return result.count;
  },

  /** senderId in the filter means nobody can delete someone else's message. Content is blanked, the row stays. */
  async softDelete(id: string, senderId: string): Promise<boolean> {
    const result = await prisma.message.updateMany({ where: { id, senderId, deletedAt: null }, data: { deletedAt: new Date(), content: "" } });
    return result.count === 1;
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
