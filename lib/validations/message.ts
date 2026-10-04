import { z } from "zod";
import { MESSAGE_MAX_LENGTH } from "@/lib/messaging/constants";

export { MESSAGE_MAX_LENGTH };

const id = z.string().trim().min(1).max(60);

export const conversationIdSchema = id;
export const messageIdSchema = id;
export const startConversationSchema = z.object({ targetUserId: id });

export const sendMessageSchema = z.object({
  content: z
    .string({ required_error: "Write a message first." })
    .max(MESSAGE_MAX_LENGTH * 2, `Keep messages under ${MESSAGE_MAX_LENGTH} characters.`)
    // NUL bytes cannot be stored in PostgreSQL text; normalise line endings so the length rule is consistent.
    .transform((v) => v.replace(/\u0000/g, "").replace(/\r\n?/g, "\n").trim())
    .pipe(z.string().min(1, "Write a message first.").max(MESSAGE_MAX_LENGTH, `Keep messages under ${MESSAGE_MAX_LENGTH} characters.`)),
  clientId: z.string().trim().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/, "Invalid client id.").optional(),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const messagePageQuerySchema = z.object({
  before: z.string().trim().min(1).max(60).optional().catch(undefined),
  limit: z.coerce.number().int().min(1).max(50).catch(30),
});
