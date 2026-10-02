import type { ProfileVisibility } from "@prisma/client";

type VisibilityFields = { visibility: ProfileVisibility; profileVisible: boolean } | null | undefined;

/** The legacy `profileVisible = false` switch always wins and means PRIVATE. A missing profile is treated as PRIVATE. */
export function effectiveVisibility(profile: VisibilityFields): ProfileVisibility {
  if (!profile) return "PRIVATE";
  if (!profile.profileVisible) return "PRIVATE";
  return profile.visibility;
}

export type ProfileAccessInput = {
  viewerId: string | null;
  ownerId: string;
  visibility: ProfileVisibility;
  connected: boolean;
  /** true when either user has blocked the other */
  blocked: boolean;
};

/** Can this viewer see the person's profile content? Enforced server-side before any profile data is returned. */
export function canViewProfile({ viewerId, ownerId, visibility, connected, blocked }: ProfileAccessInput): boolean {
  if (viewerId && viewerId === ownerId) return true;
  if (blocked) return false;
  if (visibility === "PUBLIC") return true;
  if (visibility === "CONNECTIONS_ONLY") return connected;
  return false;
}

/** Only fully public profiles are suggested to strangers. */
export function canAppearInDiscovery(visibility: ProfileVisibility): boolean {
  return visibility === "PUBLIC";
}
