import { Skeleton } from "@/components/ui/Skeleton";

export default function JobsLoading() {
  return (
    <div role="status" aria-label="Loading jobs">
      <Skeleton height={32} width="30%" className="mb-3" />
      <Skeleton height={96} className="mb-3" />
      <div className="jobs-split">
        <div className="d-grid gap-2">{[0, 1, 2, 3].map((i) => <div key={i} className="job-card"><Skeleton height={18} width="55%" className="mb-2" /><Skeleton height={14} width="35%" className="mb-2" /><Skeleton height={14} width="70%" /></div>)}</div>
        <div className="jobs-detail d-none d-lg-block"><Skeleton height={28} width="55%" className="mb-3" /><Skeleton height={14} width="30%" className="mb-4" /><Skeleton height={14} className="mb-2" /><Skeleton height={14} width="85%" /></div>
      </div>
    </div>
  );
}
