import { formatDate } from "@/lib/labels";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SkillBadge } from "@/components/ui/SkillBadge";

export function Panel({ title, icon, children, id }: { title: string; icon?: string; children: React.ReactNode; id?: string }) {
  return (
    <section className="report-panel" aria-labelledby={id ? `${id}-h` : undefined}>
      <h3 className="sub-title" id={id ? `${id}-h` : undefined}>
        {icon && <i className={`bi ${icon} me-2`} aria-hidden="true" />}{title}
      </h3>
      {children}
    </section>
  );
}

export function Bullets({ items, icon = "bi-dot", empty = "Nothing to report here." }: { items: string[]; icon?: string; empty?: string }) {
  if (!items.length) return <p className="text-muted small mb-0">{empty}</p>;
  return (
    <ul className="icon-list">
      {items.map((t, i) => <li key={`${i}-${t}`}><i className={`bi ${icon}`} aria-hidden="true" /><span>{t}</span></li>)}
    </ul>
  );
}

export function Badges({ items, tone, empty = "None" }: { items: string[]; tone: "neutral" | "have" | "missing"; empty?: string }) {
  if (!items.length) return <p className="text-muted small mb-0">{empty}</p>;
  return <div className="d-flex flex-wrap gap-1">{items.map((t) => <SkillBadge key={t} name={t} tone={tone} />)}</div>;
}

export function Rewrites({ items, heading }: { items: { original: string; improved: string; note: string }[]; heading: string }) {
  if (!items.length) return null;
  return (
    <div className="mt-3">
      <h4 className="mini-title">{heading}</h4>
      {items.map((r, i) => (
        <div className="rewrite" key={i}>
          {r.original && (<div><span className="rewrite-tag">Current</span><p className="mb-2">{r.original}</p></div>)}
          <div><span className="rewrite-tag suggested">Suggested</span><p className="mb-1">{r.improved}</p></div>
          {r.note && <p className="small text-muted mb-0">{r.note}</p>}
        </div>
      ))}
    </div>
  );
}

export function ScoreBreakdown({ scores, labels }: { scores: Record<string, number>; labels: Record<string, string> }) {
  return (
    <div className="d-grid gap-3">
      {Object.entries(labels).map(([key, label]) => <ProgressBar key={key} value={scores[key] ?? 0} label={label} />)}
    </div>
  );
}

export function scoreBand(score: number): { text: string; icon: string } {
  if (score >= 80) return { text: "Strong", icon: "bi-check-circle-fill" };
  if (score >= 60) return { text: "Good foundation", icon: "bi-info-circle-fill" };
  return { text: "Needs work", icon: "bi-exclamation-triangle-fill" };
}

export function ReportFooter({ createdAt, model, note }: { createdAt: Date; model: string | null; note: string }) {
  return (
    <p className="report-footer">
      <i className="bi bi-info-circle me-1" aria-hidden="true" />
      Analyzed {formatDate(createdAt)} with Google Gemini{model ? ` (${model})` : ""}. {note}
    </p>
  );
}
