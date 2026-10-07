import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * A short-lived, server-signed proof that "this user JUST passed email verification".
 * It exists only so the server can start a session without needing the password again; it is created and consumed
 * inside the same server action and never sent to the browser.
 */
const TTL_MS = 2 * 60_000;
const key = () => {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set.");
  return s;
};
const sign = (body: string) => createHmac("sha256", key()).update(`ticket:${body}`).digest("base64url");

export function createSignupTicket(userId: string, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ u: userId, e: now + TTL_MS, n: randomBytes(8).toString("hex") })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readSignupTicket(ticket: unknown, now = Date.now()): string | null {
  if (typeof ticket !== "string") return null;
  const [body, sig] = ticket.split(".");
  if (!body || !sig) return null;
  const good = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (good.length !== given.length || !timingSafeEqual(good, given)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString()) as { u?: string; e?: number };
    return typeof parsed.u === "string" && typeof parsed.e === "number" && parsed.e > now ? parsed.u : null;
  } catch {
    return null;
  }
}
