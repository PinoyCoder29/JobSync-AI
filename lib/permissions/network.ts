import type { ConnectionStatus } from "@prisma/client";

export type RelationshipState =
  | "SELF"
  | "NONE"
  | "PENDING_SENT"
  | "PENDING_RECEIVED"
  | "CONNECTED"
  | "BLOCKED_BY_ME";

export type ConnectionRow = { status: ConnectionStatus; requesterId: string; addresseeId: string };

export function relationshipState(viewerId: string, targetId: string, connection: ConnectionRow | null, blockedByMe: boolean): RelationshipState {
  if (viewerId === targetId) return "SELF";
  if (blockedByMe) return "BLOCKED_BY_ME";
  if (!connection) return "NONE";
  if (connection.status === "ACCEPTED") return "CONNECTED";
  if (connection.status === "PENDING") return connection.requesterId === viewerId ? "PENDING_SENT" : "PENDING_RECEIVED";
  return "NONE"; // REJECTED / CANCELLED rows are history, not a live relationship
}

/** Only the person who RECEIVED a pending request may accept or reject it. */
export const canRespondToRequest = (userId: string, c: ConnectionRow) => c.status === "PENDING" && c.addresseeId === userId;

/** Only the person who SENT a pending request may withdraw it. */
export const canCancelRequest = (userId: string, c: ConnectionRow) => c.status === "PENDING" && c.requesterId === userId;

/** Either participant may remove an accepted connection. */
export const canRemoveConnection = (userId: string, c: ConnectionRow) => c.status === "ACCEPTED" && (c.requesterId === userId || c.addresseeId === userId);

/** After a rejection the sender must wait before asking again, so a "no" cannot be turned into harassment. */
export const REREQUEST_COOLDOWN_DAYS = 14;
export function rerequestAllowed(rejectedAt: Date | null, now = new Date()): boolean {
  if (!rejectedAt) return true;
  return now.getTime() - rejectedAt.getTime() >= REREQUEST_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
}

/** Stable key for a pair of users, independent of who sent the request. */
export const pairKeyFor = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`);
