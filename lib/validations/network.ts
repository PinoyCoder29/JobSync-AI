import { z } from "zod";

const id = z.string().trim().min(1).max(50);

export const userIdSchema = id;
export const connectionIdSchema = id;
export const connectionRequestSchema = z.object({
  targetUserId: id,
  message: z.string().trim().max(300, "Keep the note under 300 characters.").optional().transform((v) => v || undefined),
});

export const networkTabSchema = z.enum(["suggestions", "requests", "connections", "following", "blocked"]).catch("suggestions");
export const cursorSchema = z.string().trim().min(1).max(50).optional().catch(undefined);
