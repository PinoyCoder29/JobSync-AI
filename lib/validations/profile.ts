import { z } from "zod";

const csv = z.string().default("").transform((s) => s.split(",").map((t) => t.trim()).filter(Boolean));
const optionalInt = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z.number().int("Use whole numbers").nonnegative().max(10_000_000).optional(),
);
const optionalUrl = z.string().trim().url("Enter a full URL, e.g. https://example.com").or(z.literal("")).default("");

export const profileSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
    headline: z.string().trim().max(120).default(""),
    summary: z.string().trim().max(1000).default(""),
    location: z.string().trim().max(120).default(""),
    targetRoles: csv,
    preferredWorkArrangement: z.enum(["ONSITE", "HYBRID", "REMOTE", ""]).default(""),
    preferredLocations: csv,
    salaryMin: optionalInt,
    salaryMax: optionalInt,
    portfolioUrl: optionalUrl,
    githubUrl: optionalUrl,
    linkedinUrl: optionalUrl,
    skills: csv,
  })
  .refine((d) => !d.salaryMin || !d.salaryMax || d.salaryMin <= d.salaryMax, {
    path: ["salaryMax"],
    message: "Maximum must be greater than or equal to minimum",
  });

export type ProfileInput = z.infer<typeof profileSchema>;

export const settingsSchema = z.object({
  notifyApplicationUpdates: z.boolean(),
  notifyJobAlerts: z.boolean(),
  notifyProductNews: z.boolean(),
  notifyReactions: z.boolean().default(true),
  notifyComments: z.boolean().default(true),
  notifyConnections: z.boolean().default(true),
  notifyMessages: z.boolean().default(true),
  showOnlineStatus: z.boolean().default(true),
  profileVisible: z.boolean(),
  visibility: z.enum(["PUBLIC", "CONNECTIONS_ONLY", "PRIVATE"]).default("PUBLIC"),
});
