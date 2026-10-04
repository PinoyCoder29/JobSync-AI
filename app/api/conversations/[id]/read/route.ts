import { fail, handleApiError, ok } from "@/lib/api-response";
import { authenticate, type RouteCtx } from "@/lib/api-route";
import { conversationIdSchema } from "@/lib/validations/message";
import { messagingService } from "@/services/messaging/messaging.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PATCH — marks everything the other person sent as read and clears this conversation's notification. Returns fresh unread counts. */
export async function PATCH(req: Request, { params }: RouteCtx<{ id: string }>) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    const id = conversationIdSchema.safeParse((await params).id);
    if (!id.success) return fail("NOT_FOUND", "We couldn't find that conversation.");
    return ok(await messagingService.markRead(a.userId!, id.data));
  } catch (error) {
    return handleApiError(error);
  }
}
