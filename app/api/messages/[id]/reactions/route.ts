import { fail, handleApiError, ok } from "@/lib/api-response";
import { authenticate, readJson, type RouteCtx } from "@/lib/api-route";
import { messageIdSchema, messageReactionSchema } from "@/lib/validations/message";
import { messagingService } from "@/services/messaging/messaging.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Ctx = RouteCtx<{ id: string }>;

/** POST { type } — set or change YOUR reaction on a message in one of your conversations. */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    const id = messageIdSchema.safeParse((await params).id);
    if (!id.success) return fail("NOT_FOUND", "We couldn't find that message.");
    const body = messageReactionSchema.safeParse(await readJson(req));
    if (!body.success) return fail("VALIDATION", "Choose a valid reaction.");
    return ok(await messagingService.react(a.userId!, id.data, body.data.type));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    const id = messageIdSchema.safeParse((await params).id);
    if (!id.success) return fail("NOT_FOUND", "We couldn't find that message.");
    return ok(await messagingService.react(a.userId!, id.data, null));
  } catch (error) {
    return handleApiError(error);
  }
}
