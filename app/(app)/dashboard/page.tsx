import type { Metadata } from "next";
import Link from "next/link";

import { JobCard } from "@/components/jobs/JobCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SkillBadge } from "@/components/ui/SkillBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";

import { PIPELINE, STATUS_LABEL, formatDate } from "@/lib/labels";

import { requireUserId } from "@/lib/session";
import { dashboardService } from "@/services/dashboard.service";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * Get the current greeting using Manila time.
 */
function greeting() {
  const hour =
    Number(
      new Date().toLocaleString("en-US", {
        hour: "numeric",
        hour12: false,
        timeZone: "Asia/Manila",
      }),
    ) % 24;

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

/**
 * Type for recent application activity.
 *
 * This prevents TypeScript from treating `a`
 * as an implicit `any`.
 */
type RecentApplication = {
  id: string;
  position: string;
  company: string;
  status: string;
  updatedAt: Date | string;
};

/**
 * Type for profile missing items.
 *
 * This prevents TypeScript from treating `m`
 * as an implicit `any`.
 */
type ProfileMissingItem = string;

export default async function DashboardPage() {
  const userId = await requireUserId();

  const d = await dashboardService.get(userId);

  const stats = [
    {
      label: "Applications",
      value: d.totalApplications,
      href: "/applications",
    },
    {
      label: "In interview stage",
      value: d.interviewApplications,
      href: "/applications?status=INTERVIEW",
    },
    {
      label: "Saved jobs",
      value: d.savedCount,
      href: "/saved-jobs",
    },
    {
      label: "Profile complete",
      value: `${d.profileCompletion.percent}%`,
      href: "/profile",
    },
    {
      label: "Resume score",
      value: d.resumeScore ?? "–",
      href: "/resume-analyzer",
    },
    {
      label: "ATS score",
      value: d.atsScore ?? "–",
      href: "/ats-checker",
    },
  ];

  const missingProfileItems = d.profileCompletion
    .missing as ProfileMissingItem[];

  const recentApplications = d.recentApplications as RecentApplication[];

  return (
    <div className="d-grid gap-5">
      {/* =========================================================
          DASHBOARD HEADER
      ========================================================= */}
      <section>
        <h1 className="page-title">
          {greeting()}, {d.name.split(" ")[0]}
        </h1>

        <p className="text-muted">Your career progress at a glance.</p>

        {/* Readiness */}
        <div className="readiness">
          <div className="flex-grow-1">
            <p className="readiness-line">
              You are <strong>{d.readiness}%</strong> ready for your next
              application.
            </p>

            <ProgressBar
              value={d.readiness}
              showValue={false}
              label="Overall readiness"
            />

            <p className="small text-muted mt-2 mb-0">
              Average of profile completion, resume completion and your latest
              demo resume and ATS scores.
            </p>
          </div>
        </div>

        {/* Statistics */}
        <dl className="stat-strip">
          {stats.map((stat) => (
            <div key={stat.label} className="stat">
              <dd>
                <Link href={stat.href}>{stat.value}</Link>
              </dd>

              <dt>{stat.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* =========================================================
          APPLICATION PIPELINE
      ========================================================= */}
      <section aria-labelledby="pipeline-h">
        <SectionHeader
          title="Application progress"
          subtitle="Where your applications stand right now."
          action={
            <Link href="/applications" className="btn btn-outline-brand btn-sm">
              Manage applications
            </Link>
          }
        />

        <ol className="pipeline" id="pipeline-h">
          {PIPELINE.map((status) => (
            <li key={status}>
              <span className="pipeline-count">{d.counts[status] ?? 0}</span>

              <span className="pipeline-label">{STATUS_LABEL[status]}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* =========================================================
          RECOMMENDED JOBS
      ========================================================= */}
      <section>
        <SectionHeader
          title="Recommended for you"
          subtitle="Best demo matches from open jobs, based on your skills, experience and preferences."
          action={
            <Link href="/jobs" className="btn btn-outline-brand btn-sm">
              See all jobs
            </Link>
          }
        />

        {d.recommended.length === 0 ? (
          <EmptyState
            icon="bi-briefcase"
            title="No jobs yet"
            text="Once jobs are available, your best matches appear here."
            href="/jobs"
            actionLabel="Find jobs"
          />
        ) : (
          <div className="d-grid gap-3">
            {d.recommended.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>

      {/* =========================================================
          CAREER INSIGHTS
      ========================================================= */}
      <section>
        <SectionHeader title="Career insights" />

        <div className="row g-4">
          {/* Strongest skills */}
          <div className="col-lg-6">
            <h3 className="sub-title">Strongest skills</h3>

            <div className="d-flex flex-wrap gap-1 mb-4">
              {d.skills.strongest.length > 0 ? (
                d.skills.strongest.map((skill) => (
                  <SkillBadge key={skill.name} name={skill.name} tone="have" />
                ))
              ) : (
                <p className="text-muted small">
                  Rate your skills at level 4 or 5 to see them here.
                </p>
              )}
            </div>

            {/* Skill gaps */}
            <h3 className="sub-title">
              Skills open jobs ask for that you don&apos;t list
            </h3>

            <div className="d-flex flex-wrap gap-1 mb-2">
              {d.skills.gaps.length > 0 ? (
                d.skills.gaps.map((skill) => (
                  <SkillBadge
                    key={skill.name}
                    name={skill.name}
                    tone="missing"
                  />
                ))
              ) : (
                <p className="text-muted small">No gaps found.</p>
              )}
            </div>

            <Link href="/skill-analysis" className="small">
              View full skill analysis
            </Link>
          </div>

          {/* Profile improvements */}
          <div className="col-lg-6">
            <h3 className="sub-title">Profile improvements</h3>

            {missingProfileItems.length > 0 ? (
              <ul className="check-list">
                {missingProfileItems
                  .slice(0, 4)
                  .map((missingItem: ProfileMissingItem) => (
                    <li key={missingItem}>
                      <Link href="/profile">{missingItem}</Link>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-muted small">Your profile is complete.</p>
            )}

            {/* Resume suggestions */}
            <h3 className="sub-title mt-4">
              Resume suggestions <span className="demo-tag">Demo</span>
            </h3>

            {d.resumeSuggestions.length > 0 ? (
              <ul className="check-list">
                {d.resumeSuggestions.map((suggestion: string) => (
                  <li key={suggestion}>{suggestion}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted small">
                Run the <Link href="/resume-analyzer">resume analyzer</Link> to
                get suggestions.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================
          RECENT APPLICATION ACTIVITY
      ========================================================= */}
      <section>
        <SectionHeader title="Recent application activity" />

        {recentApplications.length === 0 ? (
          <EmptyState
            icon="bi-kanban"
            title="No applications yet"
            text="Track a job from its detail page or add one manually."
            href="/applications"
            actionLabel="Add application"
          />
        ) : (
          <ul className="activity-list">
            {recentApplications.map((application: RecentApplication) => (
              <li key={application.id}>
                <div>
                  <strong>{application.position}</strong>

                  <span className="text-muted"> · {application.company}</span>
                </div>

                <div className="d-flex align-items-center gap-3">
                  <StatusBadge status={application.status} />

                  <span className="small text-muted">
                    {formatDate(application.updatedAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
