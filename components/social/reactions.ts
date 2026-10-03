import type { ReactionType } from "@prisma/client";

export const REACTION_META: Record<ReactionType, { emoji: string; label: string }> = {
  LIKE: { emoji: "👍", label: "Like" },
  CELEBRATE: { emoji: "👏", label: "Celebrate" },
  SUPPORT: { emoji: "🤝", label: "Support" },
  INSIGHTFUL: { emoji: "💡", label: "Insightful" },
  CURIOUS: { emoji: "🤔", label: "Curious" },
};
export const REACTION_ORDER: ReactionType[] = ["LIKE", "CELEBRATE", "SUPPORT", "INSIGHTFUL", "CURIOUS"];
