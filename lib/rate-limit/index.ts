import { AppError } from "@/lib/errors";

/**
 * Sliding-window limiter kept in memory.
 * IMPORTANT: state is per server instance. That is fine for local dev and a single Node server, but on
 * serverless (e.g. Vercel) every instance has its own counters. Swap `hit()` for Redis/Upstash before
 * relying on it as the only abuse protection in production.
 */
export type RateRule = { limit: number; windowMs: number; label: string };

export const RATE_RULES = {
  connectionRequest: { limit: 30, windowMs: 60 * 60_000, label: "connection requests" },
  follow: { limit: 60, windowMs: 60 * 60_000, label: "follow actions" },
  block: { limit: 20, windowMs: 60 * 60_000, label: "block actions" },
  upload: { limit: 10, windowMs: 60 * 60_000, label: "uploads" },
  createPost: { limit: 20, windowMs: 60 * 60_000, label: "posts" },
  postWithImages: { limit: 15, windowMs: 60 * 60_000, label: "image uploads" },
  comment: { limit: 60, windowMs: 60 * 60_000, label: "comments" },
  reaction: { limit: 300, windowMs: 60 * 60_000, label: "reactions" },
  share: { limit: 30, windowMs: 60 * 60_000, label: "shares" },
  report: { limit: 20, windowMs: 60 * 60_000, label: "reports" },
  save: { limit: 300, windowMs: 60 * 60_000, label: "save actions" },
  jobAlert: { limit: 20, windowMs: 60 * 60_000, label: "job alerts" },
  // Messaging: opening a NEW conversation is limited hard (anti mass-DM); chatting has an hourly cap plus a short burst cap.
  startConversation: { limit: 30, windowMs: 60 * 60_000, label: "new conversations" },
  sendMessage: { limit: 600, windowMs: 60 * 60_000, label: "messages" },
  sendMessageBurst: { limit: 20, windowMs: 60_000, label: "messages" },
} as const satisfies Record<string, RateRule>;

const buckets = new Map<string, number[]>();
const MAX_KEYS = 10_000;

export function hit(key: string, rule: RateRule, now = Date.now()): { allowed: boolean; retryAfterSec: number } {
  const windowStart = now - rule.windowMs;
  const recent = (buckets.get(key) ?? []).filter((t) => t > windowStart);

  if (recent.length >= rule.limit) {
    buckets.set(key, recent);
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((recent[0] + rule.windowMs - now) / 1000)) };
  }
  recent.push(now);
  buckets.set(key, recent);

  if (buckets.size > MAX_KEYS) {
    for (const [k, times] of buckets) if (!times.some((t) => t > windowStart)) buckets.delete(k);
  }
  return { allowed: true, retryAfterSec: 0 };
}

export function enforceRateLimit(userId: string, name: keyof typeof RATE_RULES): void {
  const rule = RATE_RULES[name];
  const result = hit(`${name}:${userId}`, rule);
  if (!result.allowed) {
    const minutes = Math.ceil(result.retryAfterSec / 60);
    throw new AppError(`You've reached the limit for ${rule.label}. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`, "RATE_LIMITED");
  }
}

/** Test helper. */
export function resetRateLimits(): void {
  buckets.clear();
}
