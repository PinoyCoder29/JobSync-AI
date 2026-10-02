import { CardSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading your network">
      <Skeleton height={34} width="30%" className="mb-3" />
      <Skeleton height={40} width="60%" className="mb-4" />
      <div className="person-grid"><CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
    </div>
  );
}
