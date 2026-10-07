import { z } from "zod";
import { safeHttpUrl } from "@/lib/safe-url";

export const POST_TYPES = ["TEXT", "IMAGE", "JOB", "PROJECT", "ACHIEVEMENT", "CAREER_UPDATE", "LINK"] as const;
export const VISIBILITIES = ["PUBLIC", "CONNECTIONS_ONLY", "PRIVATE"] as const;
export const REACTIONS = ["LIKE", "CELEBRATE", "SUPPORT", "INSIGHTFUL", "CURIOUS"] as const;

export const MAX_POST_LENGTH = 3000;
export const MAX_COMMENT_LENGTH = 1500;
export const MAX_POST_IMAGES = 4;

const id = z.string().trim().min(1).max(50);
export const idSchema = id;

/** Control characters (except tab/newline) have no business in user text. */
const cleanText = (max: number) =>
  z
    .string()
    .transform((v) => v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\r\n/g, "\n").trim())
    .pipe(z.string().max(max, `Keep this under ${max} characters.`));

const optionalText = (max: number) =>
  cleanText(max).optional().transform((v) => (v ? v : undefined));

/** Only plain http(s) links are stored; javascript:/data: etc. are rejected, not silently dropped. */
const linkUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => v === undefined || safeHttpUrl(v) !== null, "Enter a valid http(s) link.")
  .transform((v) => (v ? safeHttpUrl(v)! : undefined));

export const createPostSchema = z
  .object({
    content: optionalText(MAX_POST_LENGTH),
    postType: z.enum(POST_TYPES).default("TEXT"),
    visibility: z.enum(VISIBILITIES).default("PUBLIC"),
    title: optionalText(120),
    linkUrl,
    jobId: id.optional(),
  })
  .superRefine((d, ctx) => {
    if (d.postType === "JOB" && !d.jobId) ctx.addIssue({ code: "custom", path: ["jobId"], message: "Choose a job to share." });
    if (d.postType === "LINK" && !d.linkUrl) ctx.addIssue({ code: "custom", path: ["linkUrl"], message: "Add a link to share." });
    if (d.postType === "PROJECT" && !d.title) ctx.addIssue({ code: "custom", path: ["title"], message: "Give your project a name." });
    if (d.postType === "ACHIEVEMENT" && !d.title && !d.content) ctx.addIssue({ code: "custom", path: ["content"], message: "Tell people about your achievement." });
  });

export type CreatePostInput = z.infer<typeof createPostSchema>;

export const updatePostSchema = z.object({
  content: optionalText(MAX_POST_LENGTH),
  title: optionalText(120),
  visibility: z.enum(VISIBILITIES).optional(),
});

export const reactionSchema = z.object({ type: z.enum(REACTIONS).default("LIKE") });

export const commentSchema = z.object({
  content: cleanText(MAX_COMMENT_LENGTH).refine((v) => v.length > 0, "Write something first."),
  parentId: id.optional(),
});

export const commentEditSchema = z.object({ content: commentSchema.shape.content });

export const shareSchema = z.object({
  content: optionalText(MAX_POST_LENGTH),
  visibility: z.enum(VISIBILITIES).default("PUBLIC"),
});

export const REPORT_REASONS = ["SPAM", "HARASSMENT", "MISLEADING", "INAPPROPRIATE", "OTHER"] as const;
export const reportSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  details: optionalText(500),
});

export const cursorSchema = z.string().trim().min(1).max(120).optional().catch(undefined);
export const limitSchema = (def: number, max: number) =>
  z.coerce.number().int().min(1).max(max).catch(def);
