import { handleApiError, ok } from "@/lib/api-response";
import { authenticate, type RouteCtx } from "@/lib/api-route";
import { enforceRateLimit } from "@/lib/rate-limit";
import { idSchema } from "@/lib/validations/post";
import { jobService } from "@/services/job.service";

export const runtime = "nodejs";
type Ctx = RouteCtx<{ id: string }>;

/** Uses the existing SavedJob table (no duplicate model). Idempotent. */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    enforceRateLimit(a.userId!, "save");
    return ok({ saved: await jobService.setSaved(a.userId!, idSchema.parse((await params).id), true) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    return ok({ saved: await jobService.setSaved(a.userId!, idSchema.parse((await params).id), false) });
  } catch (error) {
    return handleApiError(error);
  }
}
