import { fail, handleApiError, ok } from "@/lib/api-response";
import { authenticate, readJson, type RouteCtx } from "@/lib/api-route";
import { idSchema, updatePostSchema } from "@/lib/validations/post";
import { postService } from "@/services/social/post.service";

export const runtime = "nodejs";
type Ctx = RouteCtx<{ id: string }>;

export async function GET(req: Request, { params }: Ctx) {
  try {
    const a = await authenticate(req, { mutating: false, optional: true });
    if ("error" in a) return a.error;
    const post = await postService.get(a.userId, idSchema.parse((await params).id));
    return post ? ok(post) : fail("NOT_FOUND", "This post isn't available.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    const parsed = updatePostSchema.safeParse(await readJson(req));
    if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Check your changes and try again.");
    return ok(await postService.update(a.userId!, idSchema.parse((await params).id), parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    await postService.delete(a.userId!, idSchema.parse((await params).id));
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
