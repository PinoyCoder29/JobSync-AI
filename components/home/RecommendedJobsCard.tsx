import Link from "next/link";
import { ARRANGEMENT_LABEL, EMPLOYMENT_LABEL, formatSalaryCompact, scoreTone } from "@/lib/labels";
import { jobRecommendationService } from "@/services/jobs/job-recommendation.service";

/** Compact "Recommended for you" list for the Home right sidebar. Every card carries a reason from real data. */
export async function RecommendedJobsCard({ userId, limit = 3 }: { userId: string; limit?: number }) {
  let jobs;
  try {
    jobs = await jobRecommendationService.recommend(userId, limit);
  } catch (error) {
    console.error("Recommended jobs failed", error);
    return (
      <section className="side-card"><h2 className="side-card-title"><i className="bi bi-stars" aria-hidden="true" /> Recommended for you</h2><p className="small text-muted mb-0">We couldn&apos;t load recommendations right now.</p></section>
    );
  }
  return (
    <section className="side-card" aria-labelledby="rec-jobs">
      <h2 id="rec-jobs" className="side-card-title"><i className="bi bi-stars" aria-hidden="true" /> Recommended for you</h2>
      {jobs.length === 0 ? (
        <p className="small text-muted mb-0">No jobs to recommend yet. <Link href="/jobs">Browse all jobs</Link>.</p>
      ) : (
        <ul className="featured-list">
          {jobs.map((j) => (
            <li key={j.id}>
              <Link href={`/jobs/${j.id}`} className="featured-job">
                <strong className="d-block">{j.title}</strong>
                <span className="text-muted small d-block">{j.company}</span>
                <span className="small d-block">{ARRANGEMENT_LABEL[j.workArrangement]} · {EMPLOYMENT_LABEL[j.employmentType]}</span>
                <span className="small fw-semibold d-block">{formatSalaryCompact(j.salaryMin, j.salaryMax, j.currency)}</span>
                {j.match !== null && <span className={`match-pill tone-${scoreTone(j.match)} mt-1`} title="Internal recommendation indicator, not a guarantee of fit">{j.match}% match</span>}
                {j.reasons?.[0] && <span className="reason d-block mt-1">{j.reasons[0]}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href="/jobs?sort=best_match" className="side-card-more">View all jobs →</Link>
    </section>
  );
}
