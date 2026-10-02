import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import type { PersonCardData } from "@/services/networking.service";

export function PersonCard({ person, reasons, note, children }: { person: PersonCardData; reasons?: string[]; note?: string | null; children?: React.ReactNode }) {
  return (
    <article className="person-card">
      <Link href={`/people/${person.id}`} className="person-card-main" aria-label={`View ${person.name}'s profile`}>
        <Avatar name={person.name} src={person.avatarUrl} size={56} />
        <div className="min-w-0">
          <h3 className="h6 mb-0 text-truncate">{person.name}</h3>
          {person.headline && <p className="small mb-0 text-truncate">{person.headline}</p>}
          {person.location && <p className="small text-muted mb-0 text-truncate"><i className="bi bi-geo-alt me-1" aria-hidden="true" />{person.location}</p>}
        </div>
      </Link>
      {reasons && reasons.length > 0 && (
        <ul className="person-reasons small text-muted">
          {reasons.map((r) => <li key={r}><i className="bi bi-check2 me-1" aria-hidden="true" />{r}</li>)}
        </ul>
      )}
      {note && <blockquote className="person-note small">&ldquo;{note}&rdquo;</blockquote>}
      {children && <div className="person-actions">{children}</div>}
    </article>
  );
}
