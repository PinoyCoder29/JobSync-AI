import { fail, handleApiError, ok } from "@/lib/api-response";
import { authenticate, readJson } from "@/lib/api-route";
import { startLiveSchema } from "@/lib/validations/live-interview";
import { liveInterviewService } from "@/services/interview/live-interview.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST — start an AI interview. The AI key stays on the server. */
export async function POST(req: Request) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    const body = startLiveSchema.safeParse(await readJson(req));
    if (!body.success) return fail("VALIDATION", body.error.issues[0]?.message ?? "Check your interview settings.");
    return ok(await liveInterviewService.start(a.userId!, body.data), undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
