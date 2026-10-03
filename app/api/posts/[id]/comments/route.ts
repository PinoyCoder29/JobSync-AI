import { fail, handleApiError, ok } from "@/lib/api-response";
import { authenticate, readJson, type RouteCtx } from "@/lib/api-route";
import { commentSchema, cursorSchema, idSchema } from "@/lib/validations/post";
import { commentService } from "@/services/social/comment.service";

export const runtime = "nodejs";
type Ctx = RouteCtx<{ id: string }>;

export async function GET(req: Request, { params }: Ctx) {
  try {
    const a = await authenticate(req, { mutating: false, optional: true });
    if ("error" in a) return a.error;
    const cursor = cursorSchema.parse(new URL(req.url).searchParams.get("cursor") ?? undefined);
    const page = await commentService.list(a.userId, idSchema.parse((await params).id), cursor);
    return ok(page.items, { nextCursor: page.nextCursor, hasMore: page.hasMore });
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST { content, parentId? } — parentId must be a top-level comment (one reply level only). */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    const parsed = commentSchema.safeParse(await readJson(req));
    if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Write something first.");
    return ok(await commentService.add(a.userId!, idSchema.parse((await params).id), parsed.data), undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
