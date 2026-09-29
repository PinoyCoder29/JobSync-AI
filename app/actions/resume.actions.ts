"use server";

import { revalidatePath } from "next/cache";
import { toUserMessage } from "@/lib/errors";
import { requireUserId } from "@/lib/session";
import { resumeService } from "@/services/resume.service";
import type { ActionState } from "@/types";

/** Persists one wizard step. `nextStep` is remembered so the user can resume where they stopped. */
export async function saveResumeStepAction(step: string, payload: unknown, nextStep: string | null): Promise<ActionState> {
  const userId = await requireUserId();
  try {
    await resumeService.saveStep(userId, step, payload, nextStep);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
}

export async function saveResumeProgressAction(step: string): Promise<void> {
  const userId = await requireUserId();
  await resumeService.setLastStep(userId, step).catch((e) => console.error(e));
}

export async function deleteResumeAction(): Promise<ActionState> {
  const userId = await requireUserId();
  try {
    await resumeService.remove(userId);
    revalidatePath("/resume");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
}
