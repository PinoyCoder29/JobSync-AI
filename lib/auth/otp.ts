import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 5 * 60_000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60_000;
export const OTP_MAX_SENDS = 5;
export const PENDING_TTL_MS = 24 * 60 * 60_000;

/** Cryptographically secure 6-digit code (crypto.randomInt, uniform; never Math.random). */
export const generateOtp = (): string => String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set.");
  return s;
}

/**
 * Only this hash is stored. A bare SHA-256 of a 6-digit code could be brute-forced offline in milliseconds,
 * so it is an HMAC keyed with AUTH_SECRET and bound to the email.
 */
export const hashOtp = (email: string, code: string): string => createHmac("sha256", secret()).update(`otp:${email.toLowerCase()}:${code}`).digest("hex");

export function otpMatches(email: string, code: string, storedHash: string): boolean {
  if (!/^\d{6}$/.test(code) || !storedHash) return false;
  const a = Buffer.from(hashOtp(email, code), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 1)}***@${domain}`;
}

export type PendingState = { codeHash: string; codeExpiresAt: Date; attempts: number };
/** Decides, BEFORE comparing anything, whether this code may still be tried. */
export function checkPending(p: PendingState, now = new Date()): "OPEN" | "EXPIRED" | "LOCKED" {
  if (!p.codeHash || p.attempts >= OTP_MAX_ATTEMPTS) return "LOCKED";
  if (p.codeExpiresAt.getTime() <= now.getTime()) return "EXPIRED";
  return "OPEN";
}

export const resendWaitMs = (lastSentAt: Date, now = new Date()) => Math.max(0, lastSentAt.getTime() + OTP_RESEND_COOLDOWN_MS - now.getTime());
