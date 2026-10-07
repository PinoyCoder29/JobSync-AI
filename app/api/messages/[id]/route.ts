import { fail, handleApiError, ok } from "@/lib/api-response";
import { authenticate, readJson, type RouteCtx } from "@/lib/api-route";
import { deleteScopeSchema, editMessageSchema, messageIdSchema } from "@/lib/validations/message";
import { messagingService } from "@/services/messaging/messaging.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Ctx = RouteCtx<{ id: string }>;

/** PATCH { content } — edit YOUR OWN message. Anyone else gets 403. */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    const id = messageIdSchema.safeParse((await params).id);
    if (!id.success) return fail("NOT_FOUND", "We couldn't find that message.");
    const body = editMessageSchema.safeParse(await readJson(req));
    if (!body.success) return fail("VALIDATION", body.error.issues[0]?.message ?? "Write a message first.");
    return ok(await messagingService.edit(a.userId!, id.data, body.data.content));
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE ?scope=me|everyone
 *  - me:       hides it from YOUR view only (the other person still sees it)
 *  - everyone: sender only; erases the content for both people (a "deleted" placeholder remains). Default.
 */
export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    const id = messageIdSchema.safeParse((await params).id);
    if (!id.success) return fail("NOT_FOUND", "We couldn't find that message.");
    const scope = deleteScopeSchema.parse(new URL(req.url).searchParams.get("scope") ?? undefined);
    return ok(scope === "me" ? await messagingService.deleteForMe(a.userId!, id.data) : await messagingService.deleteForEveryone(a.userId!, id.data));
  } catch (error) {
    return handleApiError(error);
  }
}
