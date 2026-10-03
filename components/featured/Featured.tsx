import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { ARRANGEMENT_LABEL, EMPLOYMENT_LABEL, formatSalaryCompact, scoreTone } from "@/lib/labels";
import { getFeaturedCached, type FeaturedBlock } from "@/services/social/featured.service";
import type { FeaturedCategory } from "@prisma/client";

const ICON: Record<FeaturedCategory, string> = {
  FEATURED_JOB: "bi-fire", FEATURED_COMPANY: "bi-building", FEATURED_PERSON: "bi-people", FEATURED_POST: "bi-chat-square-heart",
  FEATURED_SKILL: "bi-graph-up-arrow", FEATURED_LEARNING: "bi-mortarboard", FEATURED_EVENT: "bi-calendar-event",
};

function Body({ block, compact }: { block: FeaturedBlock; compact: boolean }) {
  switch (block.category) {
    case "FEATURED_JOB":
      return (
        <ul className="featured-list">
          {block.items.map((j) => (
            <li key={j.id}>
              <Link href={`/jobs/${j.id}`} className="featured-job">
                <span className="d-flex justify-content-between gap-2">
                  <strong className="text-truncate">{j.title}</strong>
                  {j.match !== null && <span className={`match-pill tone-${scoreTone(j.match)} flex-shrink-0`} title="Internal recommendation indicator, not a guarantee">{j.match}% match</span>}
                </span>
                <span className="text-muted small d-block">{j.company}</span>
                <span className="small d-block">{ARRANGEMENT_LABEL[j.workArrangement]} · {EMPLOYMENT_LABEL[j.employmentType]}</span>
                <span className="small fw-semibold d-block">{formatSalaryCompact(j.salaryMin, j.salaryMax, j.currency)}</span>
                {!compact && j.reasons[0] && <span className="reason d-block mt-1"><i className="bi bi-lightbulb" aria-hidden="true" /> {j.reasons[0]}</span>}
              </Link>
            </li>
          ))}
        </ul>
      );
    case "FEATURED_COMPANY":
      return (
        <ul className="featured-list">
          {block.items.map((c) => (
            <li key={c.name}>
              <Link href={`/jobs?keyword=${encodeURIComponent(c.name)}`} className="featured-row">
                <span className="company-logo" aria-hidden="true">{c.name.charAt(0).toUpperCase()}</span>
                <span className="min-w-0"><strong className="d-block text-truncate">{c.name}</strong><span className="small text-muted">{c.jobs} open {c.jobs === 1 ? "job" : "jobs"}</span></span>
              </Link>
            </li>
          ))}
        </ul>
      );
    case "FEATURED_PERSON":
      return (
        <ul className="featured-list">
          {block.items.map((p) => (
            <li key={p.id}>
              <Link href={`/people/${p.id}`} className="featured-row">
                <Avatar name={p.name} src={p.avatarUrl} size={40} />
                <span className="min-w-0"><strong className="d-block text-truncate">{p.name}</strong>{p.headline && <span className="small text-muted d-block text-truncate">{p.headline}</span>}{p.reasons[0] && <span className="small d-block text-truncate">{p.reasons[0]}</span>}</span>
              </Link>
            </li>
          ))}
        </ul>
      );
    case "FEATURED_SKILL":
      return (
        <ul className="featured-list">
          {block.items.map((s) => (
            <li key={s.name}>
              <Link href={`/jobs?skill=${encodeURIComponent(s.name)}`} className="featured-row justify-content-between">
                <span><strong>{s.name}</strong>{s.have && <span className="rel-chip ms-2">On your profile</span>}</span>
                <span className="small text-muted">{s.jobs} {s.jobs === 1 ? "job" : "jobs"}</span>
              </Link>
            </li>
          ))}
        </ul>
      );
    case "FEATURED_POST":
      return (
        <ul className="featured-list">
          {block.items.map((p) => (
            <li key={p.id}>
              <Link href={`/posts/${p.id}`} className="featured-row">
                <Avatar name={p.author.name} src={p.author.avatarUrl} size={36} />
                <span className="min-w-0"><strong className="d-block text-truncate">{p.author.name}</strong><span className="small text-muted d-block text-truncate">{p.title ?? p.content ?? "Shared a post"}</span></span>
              </Link>
            </li>
          ))}
        </ul>
      );
    default:
      return null;
  }
}

const SEE_ALL: Partial<Record<FeaturedCategory, { href: string; label: string }>> = {
  FEATURED_JOB: { href: "/jobs", label: "View all jobs" },
  FEATURED_PERSON: { href: "/network", label: "See more people" },
  FEATURED_SKILL: { href: "/skill-analysis", label: "Analyse my skills" },
};

/**
 * One reusable Featured block (Home, Find Jobs, Network, Profile, Search). Data comes from featuredService, which
 * uses admin-controlled FeaturedItem rows first and a real-data algorithmic fallback otherwise. A block with no
 * content renders nothing rather than a hollow card.
 */
export async function Featured({ category, userId, limit = 3, title, compact = true }: { category: FeaturedCategory; userId: string | null; limit?: number; title?: string; compact?: boolean }) {
  let block: FeaturedBlock;
  try {
    block = await getFeaturedCached(category, userId, limit);
  } catch (error) {
    console.error("Featured failed", category, error);
    return null;
  }
  if (block.items.length === 0) return null;
  const more = SEE_ALL[category];
  return (
    <section className="side-card" aria-labelledby={`feat-${category}`}>
      <h2 id={`feat-${category}`} className="side-card-title"><i className={`bi ${ICON[category]}`} aria-hidden="true" /> {title ?? block.title}</h2>
      <Body block={block} compact={compact} />
      {more && <Link href={more.href} className="side-card-more">{more.label} →</Link>}
    </section>
  );
}
