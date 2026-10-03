import type { Metadata } from "next";
import { JobsExplorer } from "@/components/jobs/JobsExplorer";
import { buildJobSearchParams, parseJobSearch } from "@/lib/job-search";
import { getCurrentUserId } from "@/lib/session";
import { jobService } from "@/services/job.service";
import { toJobDetailDTO, toJobSummary } from "@/services/social/mappers";

export const metadata: Metadata = { title: "Find Jobs" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * Server-side search: every filter is a URL parameter, the database does the filtering, sorting and paging,
 * and the client only receives one page at a time.
 */
export default async function JobsPage({ searchParams }: Props) {
  const raw = await searchParams;
  const { filters, sort, hasFilters } = parseJobSearch(raw);
  const userId = await getCurrentUserId();
  const jobParam = typeof raw.job === "string" ? raw.job.slice(0, 50) : null;

  let failed = false;
  const page = await jobService.searchPage(filters, sort, userId).catch((error) => {
    console.error("Job search failed", error);
    failed = true;
    return { items: [], hasMore: false, nextCursor: null };
  });
  const detailData = jobParam ? await jobService.detail(jobParam, userId).catch(() => null) : null;

  // canonical query (friendly values) so the client and the shared URL agree
  const query = buildJobSearchParams(filters, sort).toString();

  return (
    <JobsExplorer
      key={`${query}|${jobParam ?? ""}`}
      query={query}
      initialItems={page.items.map(toJobSummary)}
      initialCursor={page.nextCursor}
      initialHasMore={page.hasMore}
      selectedId={detailData ? jobParam : null}
      initialDetail={detailData ? toJobDetailDTO(detailData) : null}
      signedIn={Boolean(userId)}
      hasFilters={hasFilters}
      failed={failed}
    />
  );
}
