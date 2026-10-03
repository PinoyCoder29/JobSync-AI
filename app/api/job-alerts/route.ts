import { fail, handleApiError, ok } from "@/lib/api-response";
import { authenticate, readJson } from "@/lib/api-route";
import { jobAlertSchema } from "@/lib/validations/job-alert";
import { jobAlertService } from "@/services/jobs/job-alert.service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const a = await authenticate(req, { mutating: false });
    if ("error" in a) return a.error;
    return ok(await jobAlertService.list(a.userId!));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    const parsed = jobAlertSchema.safeParse(await readJson(req));
    if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Check your alert and try again.");
    return ok(await jobAlertService.create(a.userId!, parsed.data), undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
