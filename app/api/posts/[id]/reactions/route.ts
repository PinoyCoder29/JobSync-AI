import { fail, handleApiError, ok } from "@/lib/api-response";
import { authenticate, readJson, type RouteCtx } from "@/lib/api-route";
import { cursorSchema, idSchema, reactionSchema, REACTIONS } from "@/lib/validations/post";
import { postService } from "@/services/social/post.service";

export const runtime = "nodejs";
type Ctx = RouteCtx<{ id: string }>;

/** GET ?type=LIKE&cursor=… — who reacted (visible to anyone who can see the post). */
export async function GET(req: Request, { params }: Ctx) {
  try {
    const a = await authenticate(req, { mutating: false, optional: true });
    if ("error" in a) return a.error;
    const sp = new URL(req.url).searchParams;
    const type = REACTIONS.find((t) => t === sp.get("type")) ;
    const page = await postService.listReactors(a.userId, idSchema.parse((await params).id), { type, cursor: cursorSchema.parse(sp.get("cursor") ?? undefined) });
    return ok(page.items, { nextCursor: page.nextCursor, hasMore: page.hasMore });
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST { type } — sets or CHANGES your reaction (one row per user per post). */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    const parsed = reactionSchema.safeParse(await readJson(req));
    if (!parsed.success) return fail("VALIDATION", "Choose a valid reaction.");
    return ok(await postService.react(a.userId!, idSchema.parse((await params).id), parsed.data.type));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    return ok(await postService.unreact(a.userId!, idSchema.parse((await params).id)));
  } catch (error) {
    return handleApiError(error);
  }
}
