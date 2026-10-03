import { fail, handleApiError, ok } from "@/lib/api-response";
import { authenticate, type RouteCtx } from "@/lib/api-route";
import { idSchema } from "@/lib/validations/post";
import { jobService } from "@/services/job.service";
import { toJobDetailDTO } from "@/services/social/mappers";

export const runtime = "nodejs";

/** Job + public company fields + skills + match info + saved/applied status. No recruiter or private data exists on Job. */
export async function GET(req: Request, { params }: RouteCtx<{ id: string }>) {
  try {
    const a = await authenticate(req, { mutating: false, optional: true });
    if ("error" in a) return a.error;
    const detail = await jobService.detail(idSchema.parse((await params).id), a.userId);
    return detail ? ok(toJobDetailDTO(detail)) : fail("NOT_FOUND", "This job is no longer available.");
  } catch (error) {
    return handleApiError(error);
  }
}
