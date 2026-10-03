import { Skeleton } from "@/components/ui/Skeleton";

export default function JobLoading() {
  return (
    <div className="job-page" role="status" aria-label="Loading job">
      <Skeleton height={32} width="55%" className="mb-2" /><Skeleton height={18} width="30%" className="mb-3" /><Skeleton height={14} width="45%" className="mb-4" />
      <Skeleton height={14} className="mb-2" /><Skeleton height={14} className="mb-2" /><Skeleton height={14} width="80%" />
    </div>
  );
}
