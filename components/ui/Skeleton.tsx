export function Skeleton({ height = 16, width = "100%", className = "" }: { height?: number; width?: string; className?: string }) {
  return <div className={`skeleton ${className}`} style={{ height, width }} aria-hidden="true" />;
}

export function CardSkeleton() {
  return (
    <div className="job-card" aria-hidden="true">
      <Skeleton height={20} width="55%" className="mb-2" />
      <Skeleton height={14} width="35%" className="mb-3" />
      <Skeleton height={14} width="80%" className="mb-2" />
      <Skeleton height={14} width="65%" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <Skeleton height={34} width="40%" className="mb-2" />
      <Skeleton height={16} width="25%" className="mb-4" />
      <div className="d-grid gap-3">
        <CardSkeleton /><CardSkeleton /><CardSkeleton />
      </div>
    </div>
  );
}
