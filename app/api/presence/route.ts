import { handleApiError, ok } from "@/lib/api-response";
import { authenticate } from "@/lib/api-route";
import { presenceService } from "@/services/presence.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST — heartbeat: "I'm here". Identity comes from the session; the DB write is throttled to one per 30s. */
export async function POST(req: Request) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    await presenceService.heartbeat(a.userId!);
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
