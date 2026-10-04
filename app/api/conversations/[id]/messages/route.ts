import { fail, handleApiError, ok } from "@/lib/api-response";
import { authenticate, readJson, type RouteCtx } from "@/lib/api-route";
import { conversationIdSchema, messagePageQuerySchema, sendMessageSchema } from "@/lib/validations/message";
import { messagingService } from "@/services/messaging/messaging.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Ctx = RouteCtx<{ id: string }>;

/** GET ?before=<messageId>&limit=<n> — messages oldest -> newest. Without `before` it returns the latest page (used for polling). */
export async function GET(req: Request, { params }: Ctx) {
  try {
    const a = await authenticate(req, { mutating: false });
    if ("error" in a) return a.error;
    const id = conversationIdSchema.safeParse((await params).id);
    if (!id.success) return fail("NOT_FOUND", "We couldn't find that conversation.");
    const query = messagePageQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
    const page = await messagingService.messages(a.userId!, id.data, query);
    return ok(page.items, { nextCursor: page.nextCursor, hasMore: page.hasMore });
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST { content, clientId? } — the sender is ALWAYS the session user; any senderId in the body is ignored. */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    const id = conversationIdSchema.safeParse((await params).id);
    if (!id.success) return fail("NOT_FOUND", "We couldn't find that conversation.");
    const body = sendMessageSchema.safeParse(await readJson(req));
    if (!body.success) return fail("VALIDATION", body.error.issues[0]?.message ?? "Write a message first.");
    return ok(await messagingService.send(a.userId!, id.data, body.data), undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
