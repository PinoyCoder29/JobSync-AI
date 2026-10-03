import { handleApiError, ok } from "@/lib/api-response";
import { jobRepository } from "@/repositories/job.repository";

export const runtime = "nodejs";

/** Skill name suggestions for the Find Jobs skill filter. Public data; no auth needed. */
export async function GET(req: Request) {
  try {
    const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 40);
    return ok(await jobRepository.skillNames(q, 10));
  } catch (error) {
    return handleApiError(error);
  }
}
