"use server";

import { revalidatePath } from "next/cache";
import { toUserMessage } from "@/lib/errors";
import { requireUserId } from "@/lib/session";
import { connectionIdSchema, connectionRequestSchema, userIdSchema } from "@/lib/validations/network";
import { networkingService } from "@/services/networking.service";
import type { ActionState } from "@/types";

/**
 * Every action takes the acting user from the SESSION (requireUserId), never from the form.
 * Ids that come from the form are validated, and the service re-checks ownership/permissions.
 */
async function run(fn: (userId: string) => Promise<{ message: string }>, targetUserId?: string): Promise<ActionState> {
  const userId = await requireUserId();
  try {
    const result = await fn(userId);
    revalidatePath("/network");
    if (targetUserId) revalidatePath(`/people/${targetUserId}`);
    return { ok: true, message: result.message };
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
}

const invalid = (message: string): ActionState => ({ ok: false, message });

export async function sendConnectionRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = connectionRequestSchema.safeParse({ targetUserId: formData.get("targetUserId"), message: formData.get("message") ?? undefined });
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? "Something is wrong with that request.");
  return run((userId) => networkingService.sendRequest(userId, parsed.data.targetUserId, parsed.data.message), parsed.data.targetUserId);
}

export async function respondToRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = connectionIdSchema.safeParse(formData.get("connectionId"));
  const decision = formData.get("decision") === "accept" ? "ACCEPTED" : "REJECTED";
  if (!id.success) return invalid("That request is no longer available.");
  return run((userId) => networkingService.respond(userId, id.data, decision));
}

export async function cancelRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = connectionIdSchema.safeParse(formData.get("connectionId"));
  if (!id.success) return invalid("That request is no longer available.");
  return run((userId) => networkingService.cancelRequest(userId, id.data));
}

export async function removeConnectionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const target = userIdSchema.safeParse(formData.get("targetUserId"));
  if (!target.success) return invalid("We couldn't find that person.");
  return run((userId) => networkingService.removeConnection(userId, target.data), target.data);
}

export async function followAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const target = userIdSchema.safeParse(formData.get("targetUserId"));
  if (!target.success) return invalid("We couldn't find that person.");
  return run((userId) => networkingService.follow(userId, target.data), target.data);
}

export async function unfollowAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const target = userIdSchema.safeParse(formData.get("targetUserId"));
  if (!target.success) return invalid("We couldn't find that person.");
  return run((userId) => networkingService.unfollow(userId, target.data), target.data);
}

export async function blockUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const target = userIdSchema.safeParse(formData.get("targetUserId"));
  if (!target.success) return invalid("We couldn't find that person.");
  return run((userId) => networkingService.block(userId, target.data), target.data);
}

export async function unblockUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const target = userIdSchema.safeParse(formData.get("targetUserId"));
  if (!target.success) return invalid("We couldn't find that person.");
  return run((userId) => networkingService.unblock(userId, target.data), target.data);
}
