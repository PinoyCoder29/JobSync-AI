import { fail, handleApiError, ok } from "@/lib/api-response";
import { authenticate, type RouteCtx } from "@/lib/api-route";
import { liveIdSchema } from "@/lib/validations/live-interview";
import { liveInterviewService } from "@/services/interview/live-interview.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — resume an interview or open its report. Only the owner can read it. */
export async function GET(req: Request, { params }: RouteCtx<{ id: string }>) {
  try {
    const a = await authenticate(req, { mutating: false });
    if ("error" in a) return a.error;
    const id = liveIdSchema.safeParse((await params).id);
    if (!id.success) return fail("NOT_FOUND", "We couldn't find that interview.");
    return ok(await liveInterviewService.get(a.userId!, id.data));
  } catch (error) {
    return handleApiError(error);
  }
}
