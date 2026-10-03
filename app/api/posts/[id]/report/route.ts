import { fail, handleApiError, ok } from "@/lib/api-response";
import { authenticate, readJson, type RouteCtx } from "@/lib/api-route";
import { idSchema, reportSchema } from "@/lib/validations/post";
import { postService } from "@/services/social/post.service";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: RouteCtx<{ id: string }>) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    const parsed = reportSchema.safeParse(await readJson(req));
    if (!parsed.success) return fail("VALIDATION", "Choose a reason for your report.");
    return ok(await postService.report(a.userId!, idSchema.parse((await params).id), parsed.data), undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
