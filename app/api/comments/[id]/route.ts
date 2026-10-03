import { handleApiError, ok } from "@/lib/api-response";
import { authenticate, type RouteCtx } from "@/lib/api-route";
import { idSchema } from "@/lib/validations/post";
import { commentService } from "@/services/social/comment.service";

export const runtime = "nodejs";

/** Authors can delete their own comments; the post's author can remove comments on their post. */
export async function DELETE(req: Request, { params }: RouteCtx<{ id: string }>) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    await commentService.delete(a.userId!, idSchema.parse((await params).id));
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
