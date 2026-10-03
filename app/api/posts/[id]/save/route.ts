import { handleApiError, ok } from "@/lib/api-response";
import { authenticate, type RouteCtx } from "@/lib/api-route";
import { idSchema } from "@/lib/validations/post";
import { postService } from "@/services/social/post.service";

export const runtime = "nodejs";
type Ctx = RouteCtx<{ id: string }>;

export async function POST(req: Request, { params }: Ctx) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    return ok(await postService.save(a.userId!, idSchema.parse((await params).id)));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    return ok(await postService.unsave(a.userId!, idSchema.parse((await params).id)));
  } catch (error) {
    return handleApiError(error);
  }
}
