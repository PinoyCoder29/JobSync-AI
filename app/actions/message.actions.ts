"use server";

import { redirect } from "next/navigation";
import { toUserMessage } from "@/lib/errors";
import { requireUserId } from "@/lib/session";
import { startConversationSchema } from "@/lib/validations/message";
import { messagingService } from "@/services/messaging/messaging.service";
import type { ActionState } from "@/types";

/**
 * Profile -> Message. The acting user comes from the SESSION; the form only supplies who to message, and the service
 * re-checks blocks and privacy. On success the user lands in the (existing or new) conversation.
 */
export async function startConversationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = startConversationSchema.safeParse({ targetUserId: formData.get("targetUserId") });
  if (!parsed.success) return { ok: false, message: "We couldn't find that person." };

  let conversationId: string;
  try {
    ({ conversationId } = await messagingService.start(userId, parsed.data.targetUserId));
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
  redirect(`/messages/${conversationId}`); // outside try/catch: redirect() works by throwing
}
