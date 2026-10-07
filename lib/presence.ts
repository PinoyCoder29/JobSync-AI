/**
 * Presence, first implementation: a heartbeat updates User.lastSeenAt; "online" = seen in the last 2 minutes.
 * Pure helpers only (no server imports) so the UI and tests can share them. A realtime transport (SSE/WebSocket)
 * can later replace the heartbeat WITHOUT changing these types or the privacy rules.
 */
export const HEARTBEAT_MS = 45_000;
export const ONLINE_WINDOW_MS = 2 * 60_000;

export type PresenceDTO = { visible: boolean; online: boolean; lastSeenAt: string | null };
export const HIDDEN_PRESENCE: PresenceDTO = { visible: false, online: false, lastSeenAt: null };

/**
 * Reciprocal privacy, like most messengers: you only see someone's status if you ALSO share yours,
 * and nobody sees the status of a person who turned "Show my online status" off.
 */
export function toPresence(input: { viewerShares: boolean; targetShares: boolean; lastSeenAt: Date | null }, now = Date.now()): PresenceDTO {
  if (!input.viewerShares || !input.targetShares || !input.lastSeenAt) return HIDDEN_PRESENCE;
  return { visible: true, online: now - input.lastSeenAt.getTime() < ONLINE_WINDOW_MS, lastSeenAt: input.lastSeenAt.toISOString() };
}

function ago(ms: number): string {
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : "over a week ago";
}

/**
 * precise (messenger): "Online" / "Last active 8m ago".
 * coarse (profile page): "Online" / "Last active recently", and nothing at all after a day, so exact activity isn't exposed.
 */
export function presenceLabel(p: PresenceDTO, style: "precise" | "coarse", now = Date.now()): string | null {
  if (!p.visible || !p.lastSeenAt) return null;
  if (p.online) return "Online";
  const elapsed = now - new Date(p.lastSeenAt).getTime();
  if (style === "coarse") return elapsed < 24 * 3_600_000 ? "Last active recently" : null;
  return `Last active ${ago(elapsed)}`;
}
