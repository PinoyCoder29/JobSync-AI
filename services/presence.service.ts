import { HIDDEN_PRESENCE, toPresence, type PresenceDTO } from "@/lib/presence";
import { enforceRateLimit } from "@/lib/rate-limit";
import { userRepository } from "@/repositories/user.repository";

export const presenceService = {
  /** Called every ~45s while the app is open in a visible tab. The DB write is throttled inside the query. */
  async heartbeat(userId: string): Promise<void> {
    enforceRateLimit(userId, "presence");
    await userRepository.touchLastSeen(userId);
  },

  /**
   * Presence of `targetIds` AS SEEN BY `viewerId`. Callers must already have decided the viewer may see these people
   * at all (conversation participants, a viewable profile); this applies the "show my online status" privacy switch.
   */
  async forViewer(viewerId: string, targetIds: string[]): Promise<Map<string, PresenceDTO>> {
    const ids = [...new Set([viewerId, ...targetIds])];
    const rows = await userRepository.presenceRows(ids);
    const byId = new Map(rows.map((r) => [r.id, r]));
    const viewerShares = byId.get(viewerId)?.profile?.showOnlineStatus ?? true;
    return new Map(
      targetIds.map((id) => {
        const t = byId.get(id);
        return [id, t ? toPresence({ viewerShares, targetShares: t.profile?.showOnlineStatus ?? true, lastSeenAt: t.lastSeenAt }) : HIDDEN_PRESENCE];
      }),
    );
  },
};
