import { fail, handleApiError, ok } from "@/lib/api-response";
import { authenticate, type RouteCtx } from "@/lib/api-route";
import { messageIdSchema } from "@/lib/validations/message";
import { messagingService } from "@/services/messaging/messaging.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** DELETE — the author can delete their own message (the content is erased, a "deleted" placeholder stays in the timeline). */
export async function DELETE(req: Request, { params }: RouteCtx<{ id: string }>) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    const id = messageIdSchema.safeParse((await params).id);
    if (!id.success) return fail("NOT_FOUND", "We couldn't find that message.");
    return ok(await messagingService.deleteMessage(a.userId!, id.data));
  } catch (error) {
    return handleApiError(error);
  }
}
