import { handleApiError, ok } from "@/lib/api-response";
import { authenticate } from "@/lib/api-route";
import { searchService, SEARCH_TYPES, type SearchType } from "@/services/social/search.service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const a = await authenticate(req, { mutating: false, optional: true });
    if ("error" in a) return a.error;
    const sp = new URL(req.url).searchParams;
    const t = sp.get("type") ?? "all";
    const type = (SEARCH_TYPES as readonly string[]).includes(t) ? (t as SearchType) : "all";
    return ok(await searchService.run(a.userId, sp.get("q") ?? "", type));
  } catch (error) {
    return handleApiError(error);
  }
}
