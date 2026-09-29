"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fieldErrors } from "@/lib/action-utils";
import { toUserMessage } from "@/lib/errors";
import { requireUserId } from "@/lib/session";
import { answerSchema, startInterviewSchema } from "@/lib/validations/interview";
import { interviewService } from "@/services/interview.service";
import type { ActionState } from "@/types";

export async function startInterviewAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = startInterviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  let sessionId: string;
  try {
    sessionId = (await interviewService.start(userId, parsed.data)).id;
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
  revalidatePath("/interview");
  redirect(`/interview?session=${sessionId}`);
}

export async function answerQuestionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = answerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  try {
    await interviewService.answer(userId, parsed.data);
    revalidatePath("/interview");
    revalidatePath("/dashboard");
    return { ok: true, message: "Answer scored." };
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
}
