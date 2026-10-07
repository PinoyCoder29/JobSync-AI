"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { fieldErrors, safeRedirectPath } from "@/lib/action-utils";
import { toUserMessage } from "@/lib/errors";
import { isEnabledOAuthProvider } from "@/lib/oauth-providers";
import { redirect } from "next/navigation";
import { loginSchema, registerSchema, verifyCodeSchema } from "@/lib/validations/auth";
import { clearSignupEmail, clientIp, getSignupEmail, setSignupEmail } from "@/lib/auth/request";
import { signupService } from "@/services/auth/signup.service";
import { userService } from "@/services/user.service";
import type { ActionState } from "@/types";

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  try {
    await signIn("credentials", { ...parsed.data, redirectTo: safeRedirectPath(formData.get("callbackUrl")) });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) return { ok: false, message: "Incorrect email or password." };
    throw error; // lets Next.js perform the redirect after a successful sign-in
  }
}

/**
 * Step 1 of email sign-up. Nothing is signed in and no User exists yet: a code is emailed and we move to /verify-email.
 * (Social sign-ups skip this: Google/GitHub/Facebook have already verified the address.)
 */
export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  try {
    await signupService.start(parsed.data, await clientIp());
    await setSignupEmail(parsed.data.email);
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
  redirect("/verify-email"); // outside try/catch: redirect() works by throwing
}

/** Step 2: check the 6-digit code. On success the account is created verified and the user is signed in. */
export async function verifyEmailAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = await getSignupEmail();
  if (!email) return { ok: false, code: "NO_SIGNUP", message: "Your sign-up session ended. Please start again." };
  const parsed = verifyCodeSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { ok: false, code: "INVALID_CODE", message: "Enter the 6-digit code." };

  let ticket: string;
  try {
    ({ ticket } = await signupService.verify(email, parsed.data.code));
  } catch (error) {
    return { ok: false, code: (error as { code?: string })?.code, message: toUserMessage(error) };
  }
  await clearSignupEmail();
  try {
    await signIn("signup-ticket", { ticket, redirectTo: "/" });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) return { ok: false, message: "Your email is verified. Please log in." };
    throw error; // lets Next.js perform the redirect after a successful sign-in
  }
}

export async function resendOtpAction(): Promise<ActionState> {
  const email = await getSignupEmail();
  if (!email) return { ok: false, code: "NO_SIGNUP", message: "Your sign-up session ended. Please start again." };
  try {
    const status = await signupService.resend(email);
    return { ok: true, message: "We sent a new code.", resendAt: status.resendAt };
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
}

/** "Wrong email?" – forget the pending sign-up and start over. */
export async function changeSignupEmailAction(): Promise<void> {
  const email = await getSignupEmail();
  if (email) await signupService.cancel(email);
  await clearSignupEmail();
  redirect("/register");
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

/** One-click sign in / sign up with Google, GitHub or Facebook. The provider is checked against what is really configured. */
export async function oauthSignInAction(formData: FormData): Promise<void> {
  const provider = formData.get("provider");
  if (!isEnabledOAuthProvider(provider)) redirect("/login?error=Configuration");
  await signIn(provider, { redirectTo: safeRedirectPath(formData.get("callbackUrl")) });
}
