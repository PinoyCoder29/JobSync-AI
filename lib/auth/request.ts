import { cookies, headers } from "next/headers";

export const SIGNUP_COOKIE = "jobsync_signup_email";

/** Best-effort client IP behind a proxy, used only as a rate-limit key. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function setSignupEmail(email: string) {
  (await cookies()).set(SIGNUP_COOKIE, email, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 });
}
export async function getSignupEmail(): Promise<string | null> {
  return (await cookies()).get(SIGNUP_COOKIE)?.value || null;
}
export async function clearSignupEmail() {
  (await cookies()).delete(SIGNUP_COOKIE);
}
