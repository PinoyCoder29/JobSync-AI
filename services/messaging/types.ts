/** Plain JSON data, safe to send from server to client components and API responses. No server imports here. */

import type { ReactionType } from "@prisma/client";
import type { PresenceDTO } from "@/lib/presence";

export type MessageReactionDTO = { type: ReactionType; count: number; mine: boolean };
export type MessageReplyDTO = { id: string; preview: string; mine: boolean; deleted: boolean };

export type MessageDTO = {
  id: string;
  conversationId: string;
  senderId: string;
  /** Computed on the server from the session: true when the signed-in user wrote it. */
  mine: boolean;
  /** Empty when the message was deleted. */
  content: string;
  createdAt: string;
  /** Set when the sender edited the text (UI shows "Edited"). */
  editedAt: string | null;
  replyTo: MessageReplyDTO | null;
  reactions: MessageReactionDTO[];
  /** When the recipient opened it. Only meaningful on messages you sent. */
  readAt: string | null;
  deleted: boolean;
  /** Only returned to the sender, so a retried send can be matched with its saved copy. */
  clientId: string | null;
};

export type ConversationPersonDTO = {
  id: string;
  name: string;
  headline: string | null;
  avatarUrl: string | null;
  /** Already filtered by privacy: `visible:false` means "don't show anything". */
  presence: PresenceDTO;
};

export type ConversationSummaryDTO = {
  id: string;
  person: ConversationPersonDTO;
  lastMessage: { preview: string; createdAt: string; mine: boolean; deleted: boolean } | null;
  lastMessageAt: string | null;
  unread: number;
};

export type ConversationDetailDTO = {
  id: string;
  person: ConversationPersonDTO;
  /** false when the privacy rules no longer allow new messages (history stays readable). */
  canSend: boolean;
  sendBlockedReason: string | null;
};

/** `items` are oldest -> newest. `nextCursor` loads the page of OLDER messages. */
export type MessagePageDTO = { items: MessageDTO[]; hasMore: boolean; nextCursor: string | null };

export type UnreadCountsDTO = { notifications: number; messages: number };
