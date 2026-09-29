export function SectionHeader({ title, subtitle, action, level = 2 }: { title: string; subtitle?: string; action?: React.ReactNode; level?: 1 | 2 | 3 }) {
  const Tag = `h${level}` as "h1" | "h2" | "h3";
  const cls = level === 1 ? "page-title" : level === 2 ? "section-title" : "sub-title";
  return (
    <div className="d-flex flex-wrap align-items-end justify-content-between gap-2 mb-3">
      <div>
        <Tag className={cls}>{title}</Tag>
        {subtitle && <p className="text-muted mb-0">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
