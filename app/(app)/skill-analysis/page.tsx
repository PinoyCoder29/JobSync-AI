import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SkillBadge } from "@/components/ui/SkillBadge";
import { requireUserId } from "@/lib/session";
import { analysisService } from "@/services/analysis.service";

export const metadata: Metadata = { title: "Skill analysis" };

const LEVEL = ["", "Beginner", "Basic", "Working", "Strong", "Expert"];

export default async function SkillAnalysisPage() {
  const userId = await requireUserId();
  const s = await analysisService.skillAnalysis(userId);

  return (
    <div className="d-grid gap-4">
      <div>
        <h1 className="page-title">Skill analysis</h1>
        <p className="text-muted mb-0">Your skills (profile and resume) compared with what {s.totalJobs} open jobs ask for.</p>
      </div>

      {s.current.length === 0 ? (
        <EmptyState icon="bi-bar-chart-steps" title="No skills listed yet" text="Add skills to your profile or resume to see how you compare with open jobs." href="/profile" actionLabel="Add skills" />
      ) : (
        <>
          <section className="row g-4 align-items-center">
            <div className="col-md-4"><ProgressBar value={s.coverage} label="Coverage of in-demand skills" /></div>
            <div className="col-md-8"><p className="text-muted mb-0">You list {s.coverage}% of the distinct skills that current jobs mention. Focus on the high-priority gaps below first.</p></div>
          </section>

          <div className="row g-4">
            <section className="col-lg-6">
              <h2 className="section-title">Your skills</h2>
              <ul className="skill-levels">
                {s.current.map((c) => (
                  <li key={c.name}>
                    <span>{c.name}</span>
                    <span className="level-dots" role="img" aria-label={`${LEVEL[c.level] ?? "Working"}, ${c.level} of 5`}>
                      {[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= c.level ? "on" : ""} />)}
                    </span>
                  </li>
                ))}
              </ul>
              <h3 className="sub-title mt-3">Strongest</h3>
              <div className="d-flex flex-wrap gap-1">{s.strongest.length ? s.strongest.map((x) => <SkillBadge key={x.name} name={x.name} tone="have" />) : <span className="text-muted small">No skills rated 4 or 5 yet.</span>}</div>
            </section>

            <section className="col-lg-6">
              <h2 className="section-title">Skill gaps and learning priorities</h2>
              {s.gaps.length === 0 ? (
                <p className="text-muted">You already list every skill the open jobs mention.</p>
              ) : (
                <ol className="priority-list">
                  {s.gaps.map((g) => (
                    <li key={g.name}>
                      <div className="d-flex justify-content-between gap-2"><strong>{g.name}</strong><span className={`priority priority-${g.priority.toLowerCase()}`}>{g.priority} priority</span></div>
                      <div className="small text-muted">Mentioned in {g.jobCount} of {s.totalJobs} jobs</div>
                    </li>
                  ))}
                </ol>
              )}
              <p className="small text-muted mb-0">Priority is based on how many current jobs mention the skill. <Link href="/jobs">Browse jobs</Link> to see them.</p>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
