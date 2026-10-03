import { fail, handleApiError, ok } from "@/lib/api-response";
import { authenticate, readJson, type RouteCtx } from "@/lib/api-route";
import { idSchema, shareSchema } from "@/lib/validations/post";
import { postService } from "@/services/social/post.service";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: RouteCtx<{ id: string }>) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    const parsed = shareSchema.safeParse(await readJson(req));
    if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Check your share and try again.");
    return ok(await postService.share(a.userId!, idSchema.parse((await params).id), parsed.data), undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
