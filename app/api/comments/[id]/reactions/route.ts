import { fail, handleApiError, ok } from "@/lib/api-response";
import { authenticate, readJson, type RouteCtx } from "@/lib/api-route";
import { idSchema, reactionSchema } from "@/lib/validations/post";
import { commentService } from "@/services/social/comment.service";

export const runtime = "nodejs";
type Ctx = RouteCtx<{ id: string }>;

export async function POST(req: Request, { params }: Ctx) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    const parsed = reactionSchema.safeParse(await readJson(req));
    if (!parsed.success) return fail("VALIDATION", "Choose a valid reaction.");
    return ok(await commentService.react(a.userId!, idSchema.parse((await params).id), parsed.data.type));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    return ok(await commentService.unreact(a.userId!, idSchema.parse((await params).id)));
  } catch (error) {
    return handleApiError(error);
  }
}
