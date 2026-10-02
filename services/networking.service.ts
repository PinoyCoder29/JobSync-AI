import { AppError } from "@/lib/errors";
import { canAppearInDiscovery, canViewProfile, effectiveVisibility } from "@/lib/permissions/profile";
import {
  canCancelRequest,
  canRemoveConnection,
  canRespondToRequest,
  relationshipState,
  rerequestAllowed,
  type RelationshipState,
} from "@/lib/permissions/network";
import { getOptimizedUrl } from "@/lib/storage/cloudinary";
import { enforceRateLimit } from "@/lib/rate-limit";
import { scorePerson } from "@/lib/recommendations/people";
import {
  blockRepository,
  connectionRepository,
  discoveryRepository,
  followRepository,
  type PersonRecord,
} from "@/repositories/networking.repository";

const PAGE_SIZE = 12;
const NOT_FOUND = "We couldn't find that person.";

/** What a list card is allowed to show. Private profiles are reduced to a name. */
export type PersonCardData = {
  id: string;
  name: string;
  headline: string | null;
  location: string | null;
  avatarUrl: string | null;
};

export function toCard(person: PersonRecord): PersonCardData {
  const visibility = effectiveVisibility(person.profile);
  const showDetails = visibility !== "PRIVATE";
  const avatar = person.profile?.avatarMedia?.url;
  return {
    id: person.id,
    name: person.name?.trim() || "JobSync member",
    headline: showDetails ? person.profile?.headline ?? null : null,
    location: showDetails ? person.profile?.location ?? null : null,
    avatarUrl: avatar ? getOptimizedUrl(avatar, "avatar") : person.image ?? null,
  };
}

const otherSide = (row: { requesterId: string; requester: PersonRecord; addressee: PersonRecord }, userId: string) =>
  row.requesterId === userId ? row.addressee : row.requester;

async function requireAccessible(userId: string, targetId: string) {
  if (userId === targetId) throw new AppError("You can't do that to yourself.");
  const target = await discoveryRepository.findAccessInfo(targetId);
  // A user who blocked you looks exactly like a user who doesn't exist, so blocking is never revealed.
  if (!target || (await blockRepository.isBlockedEitherWay(userId, targetId))) throw new AppError(NOT_FOUND, "NOT_FOUND");
  return target;
}

export type Relationship = { state: RelationshipState; connectionId: string | null; following: boolean };

export const networkingService = {
  // ───────── Relationship ─────────

  async getRelationship(viewerId: string, targetId: string): Promise<Relationship> {
    const [connection, blockedByMe, following] = await Promise.all([
      connectionRepository.findBetween(viewerId, targetId),
      blockRepository.isBlockedByMe(viewerId, targetId),
      followRepository.isFollowing(viewerId, "USER", targetId),
    ]);
    return { state: relationshipState(viewerId, targetId, connection, blockedByMe), connectionId: connection?.id ?? null, following };
  },

  async summary(userId: string) {
    const [connections, pendingRequests, following, followers] = await Promise.all([
      connectionRepository.countAccepted(userId),
      connectionRepository.countIncoming(userId),
      followRepository.countFollowing(userId),
      followRepository.countFollowers("USER", userId),
    ]);
    return { connections, pendingRequests, following, followers };
  },

  // ───────── Connections ─────────

  async sendRequest(userId: string, targetId: string, message?: string): Promise<{ message: string }> {
    const target = await requireAccessible(userId, targetId);
    enforceRateLimit(userId, "connectionRequest");
    if (effectiveVisibility(target.profile) === "PRIVATE") throw new AppError("This person isn't accepting connection requests.", "FORBIDDEN");

    const existing = await connectionRepository.findBetween(userId, targetId);
    if (existing) {
      if (existing.status === "ACCEPTED") throw new AppError("You're already connected.", "CONFLICT");
      if (existing.status === "PENDING") {
        if (existing.requesterId === userId) throw new AppError("You've already sent a request to this person.", "CONFLICT");
        // They already asked us: sending a request back means both sides want it, so just connect.
        if (!(await connectionRepository.transition(existing.id, "PENDING", "ACCEPTED"))) throw new AppError("This request was already handled.", "CONFLICT");
        return { message: "You're now connected." };
      }
      if (existing.status === "REJECTED" && existing.requesterId === userId && !rerequestAllowed(existing.respondedAt)) {
        throw new AppError("This person didn't accept your last request. You can try again later.", "CONFLICT");
      }
    }
    await connectionRepository.upsertRequest(userId, targetId, message);
    return { message: "Connection request sent." };
  },

  async respond(userId: string, connectionId: string, decision: "ACCEPTED" | "REJECTED"): Promise<{ message: string }> {
    const connection = await connectionRepository.findById(connectionId);
    const other = connection && (connection.requesterId === userId ? connection.addresseeId : connection.requesterId);
    // Same answer for "doesn't exist" and "isn't yours" so request ids can't be probed.
    if (!connection || !other || !canRespondToRequest(userId, connection) || (await blockRepository.isBlockedEitherWay(userId, other))) {
      throw new AppError("This request is no longer available.", "NOT_FOUND");
    }
    if (!(await connectionRepository.transition(connectionId, "PENDING", decision))) throw new AppError("This request was already handled.", "CONFLICT");
    return { message: decision === "ACCEPTED" ? "Connection accepted." : "Request declined." };
  },

  async cancelRequest(userId: string, connectionId: string): Promise<{ message: string }> {
    const connection = await connectionRepository.findById(connectionId);
    if (!connection || !canCancelRequest(userId, connection)) throw new AppError("This request is no longer available.", "NOT_FOUND");
    if (!(await connectionRepository.transition(connectionId, "PENDING", "CANCELLED"))) throw new AppError("This request was already handled.", "CONFLICT");
    return { message: "Request withdrawn." };
  },

  async removeConnection(userId: string, otherUserId: string): Promise<{ message: string }> {
    const connection = await connectionRepository.findBetween(userId, otherUserId);
    if (!connection || !canRemoveConnection(userId, connection)) throw new AppError("You aren't connected with this person.", "NOT_FOUND");
    await connectionRepository.removeAccepted(userId, otherUserId);
    return { message: "Connection removed." };
  },

  // ───────── Following ─────────

  async follow(userId: string, targetId: string): Promise<{ message: string }> {
    const target = await requireAccessible(userId, targetId);
    enforceRateLimit(userId, "follow");
    const connection = await connectionRepository.findBetween(userId, targetId);
    const allowed = canViewProfile({
      viewerId: userId,
      ownerId: targetId,
      visibility: effectiveVisibility(target.profile),
      connected: connection?.status === "ACCEPTED",
      blocked: false,
    });
    if (!allowed) throw new AppError("You can't follow this person.", "FORBIDDEN");
    await followRepository.follow(userId, "USER", targetId);
    return { message: "You're now following this person." };
  },

  async unfollow(userId: string, targetId: string): Promise<{ message: string }> {
    await followRepository.unfollow(userId, "USER", targetId);
    return { message: "Unfollowed." };
  },

  // ───────── Blocking ─────────

  async block(userId: string, targetId: string): Promise<{ message: string }> {
    if (userId === targetId) throw new AppError("You can't block yourself.");
    if (!(await discoveryRepository.findAccessInfo(targetId))) throw new AppError(NOT_FOUND, "NOT_FOUND");
    enforceRateLimit(userId, "block");
    await blockRepository.block(userId, targetId); // also removes any connection and follows
    return { message: "User blocked." };
  },

  async unblock(userId: string, targetId: string): Promise<{ message: string }> {
    await blockRepository.unblock(userId, targetId);
    return { message: "User unblocked." };
  },

  /** Ids this user must never see or interact with. Use in search, feed and messaging queries. */
  hiddenUserIds: (userId: string) => blockRepository.hiddenUserIds(userId),

  // ───────── Lists ─────────

  async listConnections(userId: string, cursor?: string) {
    const page = await connectionRepository.listAccepted(userId, cursor, PAGE_SIZE);
    return {
      items: page.items.map((row) => ({ connectionId: row.id, person: toCard(otherSide(row, userId)) })),
      hasMore: page.hasMore,
      nextCursor: page.nextCursor,
    };
  },

  async listRequests(userId: string) {
    const [incoming, outgoing] = await Promise.all([connectionRepository.listIncoming(userId), connectionRepository.listOutgoing(userId)]);
    return {
      incoming: incoming.map((row) => ({ connectionId: row.id, note: row.message, person: toCard(row.requester) })),
      outgoing: outgoing.map((row) => ({ connectionId: row.id, person: toCard(row.addressee) })),
    };
  },

  async listFollowing(userId: string, cursor?: string) {
    const page = await followRepository.listFollowingUsers(userId, cursor, PAGE_SIZE);
    return { items: page.items.map((i) => ({ person: toCard(i.person) })), hasMore: page.hasMore, nextCursor: page.items.length ? page.items[page.items.length - 1].followId : null };
  },

  async listBlocked(userId: string) {
    return (await blockRepository.listBlockedUsers(userId)).map(toCard);
  },

  // ───────── Discovery ─────────

  /** Deterministic ranking from documented profile data only (skills, target roles, location). */
  async suggestions(userId: string, limit = PAGE_SIZE): Promise<(PersonCardData & { reasons: string[] })[]> {
    const [hidden, engaged, viewer] = await Promise.all([
      blockRepository.hiddenUserIds(userId),
      connectionRepository.engagedUserIds(userId),
      discoveryRepository.viewerSignals(userId),
    ]);
    const candidates = await discoveryRepository.findCandidates([userId, ...hidden, ...engaged], 150);

    const viewerSignals = {
      skills: viewer?.skills.map((s) => s.skill.name) ?? [],
      targetRoles: viewer?.profile?.targetRoles ?? [],
      location: viewer?.profile?.location ?? null,
    };

    return candidates
      .filter((c) => canAppearInDiscovery(effectiveVisibility(c.profile)))
      .map((candidate) => {
        const { score, reasons } = scorePerson(viewerSignals, {
          skills: candidate.skills.map((s) => s.skill.name),
          targetRoles: candidate.profile?.targetRoles ?? [],
          location: candidate.profile?.location ?? null,
        });
        return { score, card: { ...toCard(candidate), reasons: reasons.length ? reasons : ["New on JobSync AI"] } };
      })
      .sort((a, b) => b.score - a.score) // Array.sort is stable, so equal scores keep newest-first order
      .slice(0, limit)
      .map((r) => r.card);
  },

  // ───────── Profile page ─────────

  /** Returns only what this viewer is permitted to see. Privacy is decided here, on the server. */
  async getProfileView(viewerId: string, targetId: string) {
    const person = await discoveryRepository.findPerson(targetId);
    if (!person) return null;

    const [relationship, blockedEitherWay] = await Promise.all([this.getRelationship(viewerId, targetId), blockRepository.isBlockedEitherWay(viewerId, targetId)]);
    const blockedByMe = relationship.state === "BLOCKED_BY_ME";
    if (blockedEitherWay && !blockedByMe) return null; // they blocked you: indistinguishable from "not found"

    const name = person.name?.trim() || "JobSync member";
    if (blockedByMe) return { kind: "blocked" as const, id: person.id, name, relationship };

    const visibility = effectiveVisibility(person.profile);
    const allowed = canViewProfile({ viewerId, ownerId: targetId, visibility, connected: relationship.state === "CONNECTED", blocked: false });
    if (!allowed) return { kind: "restricted" as const, id: person.id, name, avatarUrl: toCard(person).avatarUrl, visibility, relationship };

    const [followers, connections] = await Promise.all([followRepository.countFollowers("USER", targetId), connectionRepository.countAccepted(targetId)]);
    const cover = person.profile?.coverMedia?.url;
    return {
      kind: "full" as const,
      id: person.id,
      name,
      headline: person.profile?.headline ?? null,
      location: person.profile?.location ?? null,
      summary: person.profile?.summary ?? null,
      avatarUrl: toCard(person).avatarUrl,
      coverUrl: cover ? getOptimizedUrl(cover, "cover") : null,
      targetRoles: person.profile?.targetRoles ?? [],
      skills: person.skills.map((s) => s.skill.name),
      links: { portfolio: person.profile?.portfolioUrl ?? null, github: person.profile?.githubUrl ?? null, linkedin: person.profile?.linkedinUrl ?? null },
      followers,
      connections,
      relationship,
    };
  },
};
