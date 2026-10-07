import { fail, handleApiError, ok } from "@/lib/api-response";
import { authenticate, type RouteCtx } from "@/lib/api-route";
import { liveIdSchema } from "@/lib/validations/live-interview";
import { liveInterviewService } from "@/services/interview/live-interview.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST — end the interview now and generate the report for what was answered. */
export async function POST(req: Request, { params }: RouteCtx<{ id: string }>) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    const id = liveIdSchema.safeParse((await params).id);
    if (!id.success) return fail("NOT_FOUND", "We couldn't find that interview.");
    return ok(await liveInterviewService.end(a.userId!, id.data));
  } catch (error) {
    return handleApiError(error);
  }
}
