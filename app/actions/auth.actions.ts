"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { fieldErrors, safeRedirectPath } from "@/lib/action-utils";
import { toUserMessage } from "@/lib/errors";
import { loginSchema, registerSchema } from "@/lib/validations/auth";
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

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  try {
    await userService.register(parsed.data);
    await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirectTo: "/dashboard" });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) return { ok: false, message: "Account created, but automatic sign-in failed. Please log in." };
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    return { ok: false, message: toUserMessage(error) };
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
