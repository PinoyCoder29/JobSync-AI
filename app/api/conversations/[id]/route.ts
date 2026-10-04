import { fail, handleApiError, ok } from "@/lib/api-response";
import { authenticate, type RouteCtx } from "@/lib/api-route";
import { conversationIdSchema } from "@/lib/validations/message";
import { messagingService } from "@/services/messaging/messaging.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Ctx = RouteCtx<{ id: string }>;

/** GET: the conversation and its latest messages. A non-participant gets 404, exactly like a conversation that doesn't exist. */
export async function GET(req: Request, { params }: Ctx) {
  try {
    const a = await authenticate(req, { mutating: false });
    if ("error" in a) return a.error;
    const id = conversationIdSchema.safeParse((await params).id);
    if (!id.success) return fail("NOT_FOUND", "We couldn't find that conversation.");
    const { conversation, messages } = await messagingService.get(a.userId!, id.data);
    return ok({ conversation, messages: messages.items }, { nextCursor: messages.nextCursor, hasMore: messages.hasMore });
  } catch (error) {
    return handleApiError(error);
  }
}
