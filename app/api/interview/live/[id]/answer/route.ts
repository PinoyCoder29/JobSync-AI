import { fail, handleApiError, ok } from "@/lib/api-response";
import { authenticate, readJson, type RouteCtx } from "@/lib/api-route";
import { liveAnswerSchema, liveIdSchema } from "@/lib/validations/live-interview";
import { liveInterviewService } from "@/services/interview/live-interview.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST { questionId, answer } — the answer is the TRANSCRIPT (typed or from speech-to-text); audio never reaches the server. */
export async function POST(req: Request, { params }: RouteCtx<{ id: string }>) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    const id = liveIdSchema.safeParse((await params).id);
    if (!id.success) return fail("NOT_FOUND", "We couldn't find that interview.");
    const body = liveAnswerSchema.safeParse(await readJson(req));
    if (!body.success) return fail("VALIDATION", body.error.issues[0]?.message ?? "Say or type your answer first.");
    return ok(await liveInterviewService.answer(a.userId!, id.data, body.data));
  } catch (error) {
    return handleApiError(error);
  }
}
