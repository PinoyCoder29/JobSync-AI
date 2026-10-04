import { handleApiError, ok } from "@/lib/api-response";
import { authenticate } from "@/lib/api-route";
import { messagingService } from "@/services/messaging/messaging.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — unread notifications and unread messages for the header badges (polled by the app shell). */
export async function GET(req: Request) {
  try {
    const a = await authenticate(req, { mutating: false });
    if ("error" in a) return a.error;
    return ok(await messagingService.unreadCounts(a.userId!));
  } catch (error) {
    return handleApiError(error);
  }
}
