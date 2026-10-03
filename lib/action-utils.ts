import type { ZodError } from "zod";
import type { ActionState } from "@/types";

export function fieldErrors(error: ZodError): ActionState {
  return { ok: false, message: "Please fix the highlighted fields.", errors: error.flatten().fieldErrors as Record<string, string[]> };
}

export function safeRedirectPath(value: FormDataEntryValue | null, fallback = "/"): string {
  const path = typeof value === "string" ? value : "";
  return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}
