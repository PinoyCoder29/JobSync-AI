import Link from "next/link";
import type { InsightDTO } from "@/services/social/types";

export function InsightCard({ insight }: { insight: InsightDTO }) {
  return (
    <article className="feed-card insight-card" aria-label="Career insight">
      <div className="feed-card-kicker"><i className="bi bi-lightbulb" aria-hidden="true" /> Career insight</div>
      <h3 className="h6 mb-1">{insight.title}</h3>
      <p className="text-muted mb-2">{insight.text}</p>
      {insight.href && insight.cta && <Link href={insight.href} className="btn btn-soft btn-sm">{insight.cta} →</Link>}
    </article>
  );
}
