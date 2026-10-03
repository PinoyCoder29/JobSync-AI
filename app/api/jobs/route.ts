import { handleApiError, ok } from "@/lib/api-response";
import { authenticate } from "@/lib/api-route";
import { parseJobSearch } from "@/lib/job-search";
import { cursorSchema, limitSchema } from "@/lib/validations/post";
import { jobService } from "@/services/job.service";
import { toJobSummary } from "@/services/social/mappers";

export const runtime = "nodejs";

/** GET /api/jobs?keyword=&location=&skill=&workArrangement=&employmentType=&experienceLevel=&minSalary=&sort=&cursor=&limit= */
export async function GET(req: Request) {
  try {
    const a = await authenticate(req, { mutating: false, optional: true });
    if ("error" in a) return a.error;
    const sp = new URL(req.url).searchParams;
    const raw: Record<string, string | string[]> = {};
    for (const key of new Set(sp.keys())) raw[key] = sp.getAll(key);
    const { filters, sort } = parseJobSearch(raw);
    const page = await jobService.searchPage(filters, sort, a.userId, cursorSchema.parse(sp.get("cursor") ?? undefined), limitSchema(15, 30).parse(sp.get("limit") ?? undefined));
    return ok(page.items.map(toJobSummary), { nextCursor: page.nextCursor, hasMore: page.hasMore });
  } catch (error) {
    return handleApiError(error);
  }
}
