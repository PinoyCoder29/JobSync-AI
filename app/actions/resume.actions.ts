"use server";

import { revalidatePath } from "next/cache";
import { fieldErrors } from "@/lib/action-utils";
import { toUserMessage } from "@/lib/errors";
import { requireUserId } from "@/lib/session";
import { resumeSchema } from "@/lib/validations/resume";
import { resumeService } from "@/services/resume.service";
import type { ActionState } from "@/types";

export async function saveResumeAction(data: unknown): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = resumeSchema.safeParse(data);
  if (!parsed.success) {
    const state = fieldErrors(parsed.error);
    const first = parsed.error.issues[0];
    return { ...state, message: `${first.path.join(" › ")}: ${first.message}` };
  }
  try {
    await resumeService.save(userId, parsed.data);
    revalidatePath("/resume");
    revalidatePath("/dashboard");
    return { ok: true, message: "Resume saved." };
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
}
