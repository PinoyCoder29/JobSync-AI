import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading profile">
      <Skeleton height={160} className="mb-3" />
      <Skeleton height={28} width="40%" className="mb-2" />
      <Skeleton height={16} width="60%" className="mb-4" />
      <Skeleton height={90} />
    </div>
  );
}
