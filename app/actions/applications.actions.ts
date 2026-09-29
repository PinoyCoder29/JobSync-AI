"use server";

import { revalidatePath } from "next/cache";
import { fieldErrors } from "@/lib/action-utils";
import { toUserMessage } from "@/lib/errors";
import { requireUserId } from "@/lib/session";
import { changeStatusSchema, createApplicationSchema } from "@/lib/validations/application";
import { applicationService } from "@/services/application.service";
import type { ActionState } from "@/types";

export async function createApplicationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = createApplicationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  try {
    await applicationService.create(userId, parsed.data);
    revalidatePath("/applications");
    revalidatePath("/dashboard");
    return { ok: true, message: "Application added." };
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
}

export async function changeStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = changeStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  try {
    await applicationService.changeStatus(userId, parsed.data);
    revalidatePath("/applications");
    revalidatePath("/dashboard");
    return { ok: true, message: "Status updated." };
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
}
