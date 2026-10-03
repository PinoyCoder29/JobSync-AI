import { fail, handleApiError, ok } from "@/lib/api-response";
import { authenticate } from "@/lib/api-route";
import { cursorSchema, limitSchema } from "@/lib/validations/post";
import { feedService } from "@/services/social/feed.service";

export const runtime = "nodejs";

/** GET /api/feed?cursor=...&limit=12 — cursor-paginated home feed. */
export async function GET(req: Request) {
  try {
    const a = await authenticate(req, { mutating: false });
    if ("error" in a) return a.error;
    const sp = new URL(req.url).searchParams;
    const page = await feedService.getFeed(a.userId!, { cursor: cursorSchema.parse(sp.get("cursor") ?? undefined), limit: limitSchema(12, 20).parse(sp.get("limit") ?? undefined) });
    return ok(page, { nextCursor: page.nextCursor, hasMore: page.hasMore });
  } catch (error) {
    return handleApiError(error);
  }
}
