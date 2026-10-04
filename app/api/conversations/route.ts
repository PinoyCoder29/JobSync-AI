import { fail, handleApiError, ok } from "@/lib/api-response";
import { authenticate, readJson } from "@/lib/api-route";
import { startConversationSchema } from "@/lib/validations/message";
import { messagingService } from "@/services/messaging/messaging.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET: the signed-in user's inbox. Only their own conversations are ever returned. */
export async function GET(req: Request) {
  try {
    const a = await authenticate(req, { mutating: false });
    if ("error" in a) return a.error;
    return ok(await messagingService.list(a.userId!));
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST { targetUserId } — opens the existing conversation with that person or creates it. The sender is the session user. */
export async function POST(req: Request) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    const parsed = startConversationSchema.safeParse(await readJson(req));
    if (!parsed.success) return fail("VALIDATION", "We couldn't find that person.");
    return ok(await messagingService.start(a.userId!, parsed.data.targetUserId));
  } catch (error) {
    return handleApiError(error);
  }
}
