import { CardSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading jobs">
      <Skeleton height={34} width="30%" className="mb-4" />
      <div className="row g-4">
        <div className="col-lg-4 col-xl-3 d-none d-lg-block"><Skeleton height={420} /></div>
        <div className="col-lg-8 col-xl-9 d-grid gap-3"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
      </div>
    </div>
  );
}
