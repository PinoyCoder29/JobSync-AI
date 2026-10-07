import { fail, handleApiError, ok } from "@/lib/api-response";
import { authenticate, readJson, type RouteCtx } from "@/lib/api-route";
import { commentEditSchema, idSchema } from "@/lib/validations/post";
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

/** PATCH { content } — only the comment's author can edit it. */
export async function PATCH(req: Request, { params }: RouteCtx<{ id: string }>) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    const parsed = commentEditSchema.safeParse(await readJson(req));
    if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Write something first.");
    return ok(await commentService.edit(a.userId!, idSchema.parse((await params).id), parsed.data.content));
  } catch (error) {
    return handleApiError(error);
  }
}
