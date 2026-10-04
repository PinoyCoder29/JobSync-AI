"use server";

import { revalidatePath } from "next/cache";
import { fieldErrors } from "@/lib/action-utils";
import { toUserMessage } from "@/lib/errors";
import { requireUserId } from "@/lib/session";
import { changePasswordSchema } from "@/lib/validations/auth";
import { profileSchema, settingsSchema } from "@/lib/validations/profile";
import { profileService } from "@/services/profile.service";
import { userService } from "@/services/user.service";
import type { ActionState } from "@/types";

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  try {
    await profileService.update(userId, parsed.data);
    revalidatePath("/profile");
    revalidatePath("/dashboard");
    return { ok: true, message: "Profile saved." };
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
}

export async function updateSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const on = (k: string) => formData.get(k) === "on";
  const parsed = settingsSchema.safeParse({
    notifyApplicationUpdates: on("notifyApplicationUpdates"),
    notifyJobAlerts: on("notifyJobAlerts"),
    notifyProductNews: on("notifyProductNews"),
    notifyReactions: on("notifyReactions"),
    notifyComments: on("notifyComments"),
    notifyConnections: on("notifyConnections"),
    notifyMessages: on("notifyMessages"),
    profileVisible: on("profileVisible"),
    visibility: formData.get("visibility") ?? "PUBLIC",
  });
  if (!parsed.success) return fieldErrors(parsed.error);
  try {
    await profileService.updateSettings(userId, parsed.data);
    revalidatePath("/settings");
    return { ok: true, message: "Preferences saved." };
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
}

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  try {
    await userService.changePassword(userId, parsed.data.currentPassword, parsed.data.newPassword);
    return { ok: true, message: "Password updated." };
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
}
