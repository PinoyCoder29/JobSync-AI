import { fail, handleApiError, ok } from "@/lib/api-response";
import { authenticate, readJson } from "@/lib/api-route";
import { assistantChatSchema } from "@/lib/validations/assistant";
import { assistantService } from "@/services/assistant/assistant.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST { message, history } — the key and the user's data stay on the server; the browser only sees the reply. */
export async function POST(req: Request) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    const body = assistantChatSchema.safeParse(await readJson(req));
    if (!body.success) return fail("VALIDATION", body.error.issues[0]?.message ?? "Ask a question first.");
    return ok(await assistantService.chat(a.userId!, body.data));
  } catch (error) {
    return handleApiError(error);
  }
}
