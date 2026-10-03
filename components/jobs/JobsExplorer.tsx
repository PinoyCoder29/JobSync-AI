"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { JobDetailBody } from "./JobDetailBody";
import { JobFilters, filtersFromQuery, filtersToQuery, type FilterState } from "./JobFilters";
import { JobResultCard } from "./JobResultCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { api, postJson } from "@/lib/client/api";
import type { JobDetailDTO, JobSummaryDTO } from "@/services/social/types";

type Props = {
  /** canonical query string for the current search (no `job` param) */
  query: string;
  initialItems: JobSummaryDTO[];
  initialCursor: string | null;
  initialHasMore: boolean;
  selectedId: string | null;
  initialDetail: JobDetailDTO | null;
  signedIn: boolean;
  hasFilters: boolean;
  failed?: boolean;
};

const DESKTOP = "(min-width: 992px)";

function ResultsSkeleton() {
  return (
    <div className="d-grid gap-2" role="status" aria-label="Loading jobs">
      {[0, 1, 2].map((i) => (
        <div key={i} className="job-card" aria-hidden="true"><div className="skeleton mb-2" style={{ height: 18, width: "55%" }} /><div className="skeleton mb-2" style={{ height: 14, width: "35%" }} /><div className="skeleton" style={{ height: 14, width: "70%" }} /></div>
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return <div role="status" aria-label="Loading job details" className="p-3"><div className="skeleton mb-3" style={{ height: 30, width: "60%" }} /><div className="skeleton mb-2" style={{ height: 16, width: "30%" }} /><div className="skeleton mb-4" style={{ height: 16, width: "45%" }} /><div className="skeleton mb-2" style={{ height: 14 }} /><div className="skeleton mb-2" style={{ height: 14 }} /><div className="skeleton" style={{ height: 14, width: "80%" }} /></div>;
}

/**
 * Find Jobs. Filters live in the URL (server renders the first page), so refresh, back/forward, bookmarks and
 * shared links all work. On desktop a click opens the job in the side panel and updates the URL with `?job=<id>`
 * (no navigation, no refetch of the list); on mobile the card is a normal link to the full /jobs/[id] page.
 */
export function JobsExplorer({ query, initialItems, initialCursor, initialHasMore, selectedId: initialSelected, initialDetail, signedIn, hasFilters, failed }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(initialSelected);
  const [detail, setDetail] = useState<JobDetailDTO | null>(initialDetail);
  const [detailState, setDetailState] = useState<"idle" | "loading" | "error">("idle");
  const [alertState, setAlertState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const latest = useRef<string | null>(initialSelected); // guards against out-of-order responses when clicking quickly
  const filters = filtersFromQuery(query);

  const urlFor = useCallback((id: string | null) => {
    const p = new URLSearchParams(query);
    if (id) p.set("job", id);
    const qs = p.toString();
    return qs ? `/jobs?${qs}` : "/jobs";
  }, [query]);

  const openJob = useCallback(async (id: string, push: boolean) => {
    latest.current = id;
    setSelectedId(id);
    setDetailState("loading");
    if (push) window.history.pushState(null, "", urlFor(id));
    try {
      const { data } = await api<JobDetailDTO>(`/api/jobs/${id}`);
      if (latest.current !== id) return;
      setDetail(data);
      setDetailState("idle");
    } catch {
      if (latest.current === id) setDetailState("error");
    }
  }, [urlFor]);

  // Desktop: open the first result automatically so the panel is never an empty box.
  useEffect(() => {
    if (!window.matchMedia(DESKTOP).matches) return;
    if (initialSelected && initialDetail) return;
    const target = initialSelected ?? initialItems[0]?.id;
    if (target) void openJob(target, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSelect(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // let "open in new tab" work
    if (!window.matchMedia(DESKTOP).matches) return; // mobile: normal navigation to /jobs/[id]
    e.preventDefault();
    void openJob(id, true);
  }

  function submit(f: FilterState) {
    setNavigating(true);
    const qs = filtersToQuery(f);
    router.push(qs ? `/jobs?${qs}` : "/jobs");
  }

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const p = new URLSearchParams(query);
      p.set("cursor", cursor);
      const { data, pagination } = await api<JobSummaryDTO[]>(`/api/jobs?${p.toString()}`);
      setItems((prev) => { const seen = new Set(prev.map((j) => j.id)); return [...prev, ...data.filter((j) => !seen.has(j.id))]; });
      setCursor(pagination?.nextCursor ?? null);
      setHasMore(Boolean(pagination?.hasMore));
    } catch (e) {
      setMoreError(e instanceof Error ? e.message : "We couldn't load more jobs.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function createAlert() {
    setAlertState("saving");
    const p = new URLSearchParams(query);
    const map = { "on-site": "ONSITE", hybrid: "HYBRID", remote: "REMOTE" } as const;
    const types = { "full-time": "FULL_TIME", "part-time": "PART_TIME", contract: "CONTRACT", internship: "INTERNSHIP" } as const;
    const levels = { entry: "ENTRY", junior: "JUNIOR", mid: "MID", senior: "SENIOR" } as const;
    try {
      await postJson("/api/job-alerts", {
        keyword: p.get("keyword") ?? undefined, location: p.get("location") ?? undefined, skills: p.getAll("skill"),
        workArrangement: map[p.get("workArrangement") as keyof typeof map], employmentType: types[p.get("employmentType") as keyof typeof types],
        experienceLevel: levels[p.get("experienceLevel") as keyof typeof levels], minSalary: p.get("minSalary") ? Number(p.get("minSalary")) : undefined,
      });
      setAlertState("done"); setAlertMsg("Alert created. We'll notify you when a matching job is posted.");
    } catch (e) {
      setAlertState("error"); setAlertMsg(e instanceof Error ? e.message : "Couldn't create the alert.");
    }
  }

  return (
    <div className="jobs-page">
      <header className="jobs-head">
        <h1 className="page-title mb-1">Find Jobs</h1>
        <p className="text-muted mb-3">Search by title, company, skill or location. Filters are saved in the page link so you can share or bookmark a search.</p>
        <JobFilters key={query} value={{ ...filters, sort: filters.sort }} onSubmit={submit} signedIn={signedIn} busy={navigating} />
        {signedIn && hasFilters && (
          <div className="mt-2 d-flex flex-wrap gap-2 align-items-center">
            <button type="button" className="btn btn-soft btn-sm" onClick={createAlert} disabled={alertState === "saving" || alertState === "done"}><i className="bi bi-bell me-1" aria-hidden="true" />Create alert for this search</button>
            {alertMsg && <span role={alertState === "error" ? "alert" : "status"} className={`small ${alertState === "error" ? "text-danger" : "text-muted"}`}>{alertMsg}</span>}
          </div>
        )}
      </header>

      <div className="jobs-split">
        <section className="jobs-results" aria-label="Job results" aria-busy={navigating}>
          {failed ? (
            <div className="empty-state error" role="alert"><i className="bi bi-exclamation-circle" aria-hidden="true" /><h2 className="h5">We couldn&apos;t load jobs.</h2><button type="button" className="btn btn-brand" onClick={() => router.refresh()}>Try again</button></div>
          ) : navigating ? <ResultsSkeleton />
          : items.length === 0 ? (
            <EmptyState icon="bi-search" title="No jobs found." text="Try changing your search filters." href="/jobs" actionLabel="Clear filters" />
          ) : (
            <>
              <p className="small text-muted" role="status">{items.length}{hasMore ? "+" : ""} {items.length === 1 ? "job" : "jobs"}</p>
              <div className="d-grid gap-2">
                {items.map((j) => <JobResultCard key={j.id} job={j} selected={j.id === selectedId} onSelect={onSelect} />)}
              </div>
              {loadingMore && <div className="mt-2"><ResultsSkeleton /></div>}
              {moreError && <p role="alert" className="small text-danger mt-2">{moreError} <button type="button" className="link-btn" onClick={loadMore}>Try again</button></p>}
              {hasMore && !loadingMore && <div className="text-center mt-3"><button type="button" className="btn btn-outline-brand" onClick={loadMore}>Load more jobs</button></div>}
            </>
          )}
        </section>

        <aside className="jobs-detail d-none d-lg-block" aria-label="Job details" aria-live="polite">
          {detailState === "loading" && <DetailSkeleton />}
          {detailState === "error" && <div className="empty-state error m-3" role="alert"><p className="mb-2">We couldn&apos;t load this job.</p><button type="button" className="btn btn-brand btn-sm" onClick={() => selectedId && openJob(selectedId, false)}>Try again</button></div>}
          {detailState === "idle" && detail && <JobDetailBody detail={detail} signedIn={signedIn} headingLevel={2} />}
          {detailState === "idle" && !detail && !navigating && <div className="empty-state m-3"><i className="bi bi-briefcase" aria-hidden="true" /><p className="text-muted mb-0">Select a job to see its details.</p></div>}
        </aside>
      </div>
    </div>
  );
}
