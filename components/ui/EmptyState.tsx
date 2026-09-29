import Link from "next/link";

export function EmptyState({ icon = "bi-inbox", title, text, href, actionLabel }: { icon?: string; title: string; text: string; href?: string; actionLabel?: string }) {
  return (
    <div className="empty-state">
      <i className={`bi ${icon}`} aria-hidden="true" />
      <h2 className="h5 mb-1">{title}</h2>
      <p className="text-muted mb-3">{text}</p>
      {href && actionLabel && <Link href={href} className="btn btn-brand">{actionLabel}</Link>}
    </div>
  );
}
