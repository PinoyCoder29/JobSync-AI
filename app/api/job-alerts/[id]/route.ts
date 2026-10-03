import { handleApiError, ok } from "@/lib/api-response";
import { authenticate, type RouteCtx } from "@/lib/api-route";
import { idSchema } from "@/lib/validations/post";
import { jobAlertService } from "@/services/jobs/job-alert.service";

export const runtime = "nodejs";

export async function DELETE(req: Request, { params }: RouteCtx<{ id: string }>) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    await jobAlertService.remove(a.userId!, idSchema.parse((await params).id));
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
