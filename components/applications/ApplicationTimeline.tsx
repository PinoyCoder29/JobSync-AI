import type { ApplicationStatusHistory } from "@prisma/client";
import { formatDate } from "@/lib/labels";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function ApplicationTimeline({ history }: { history: ApplicationStatusHistory[] }) {
  return (
    <ol className="timeline" aria-label="Status history">
      {history.map((h) => (
        <li key={h.id}>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <StatusBadge status={h.status} />
            <span className="small text-muted">{formatDate(h.changedAt)}</span>
          </div>
          {h.note && <p className="small mb-0 mt-1">{h.note}</p>}
        </li>
      ))}
    </ol>
  );
}
