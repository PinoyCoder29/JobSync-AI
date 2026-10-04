import type { ProfileVisibility } from "@prisma/client";
import { canViewProfile } from "./profile";

export type MessageAccessInput = {
  senderId: string;
  recipientId: string;
  /** The recipient's effective visibility (see effectiveVisibility in ./profile). */
  recipientVisibility: ProfileVisibility;
  /** true when the two people have an ACCEPTED connection */
  connected: boolean;
  /** true when either person has blocked the other */
  blocked: boolean;
};

/**
 * You can message anyone whose profile you are allowed to see, using the same rules the profile page uses:
 * PUBLIC = anyone, CONNECTIONS_ONLY = connections, PRIVATE = nobody. A block (either direction) always wins.
 */
export function canMessageUser({ senderId, recipientId, recipientVisibility, connected, blocked }: MessageAccessInput): boolean {
  if (senderId === recipientId || blocked) return false;
  if (recipientVisibility === "PRIVATE") return false;
  return canViewProfile({ viewerId: senderId, ownerId: recipientId, visibility: recipientVisibility, connected, blocked: false });
}

/** Why messaging isn't allowed, in words that are safe to show. (Blocks are never explained: they look like "not found".) */
export function messagingDeniedReason(name: string, visibility: ProfileVisibility): string {
  return visibility === "CONNECTIONS_ONLY" ? `You can message ${name} once you're connected.` : `${name} isn't accepting new messages.`;
}

/** Only the sender may delete a message, and only once. */
export const canDeleteMessage = (userId: string, message: { senderId: string; deletedAt: Date | null }) => message.senderId === userId && message.deletedAt === null;

export const isParticipant = (participantIds: readonly string[], userId: string) => participantIds.includes(userId);
