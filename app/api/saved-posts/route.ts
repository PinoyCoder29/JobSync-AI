import { handleApiError, ok } from "@/lib/api-response";
import { authenticate } from "@/lib/api-route";
import { cursorSchema } from "@/lib/validations/post";
import { postService } from "@/services/social/post.service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const a = await authenticate(req, { mutating: false });
    if ("error" in a) return a.error;
    const page = await postService.listSaved(a.userId!, cursorSchema.parse(new URL(req.url).searchParams.get("cursor") ?? undefined));
    return ok(page.items, { nextCursor: page.nextCursor, hasMore: page.hasMore });
  } catch (error) {
    return handleApiError(error);
  }
}
