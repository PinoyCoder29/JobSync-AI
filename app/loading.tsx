import { Skeleton } from "@/components/ui/Skeleton";

/** Shown while the Home feed renders on the server. Layout mirrors the real page so nothing jumps. */
export default function HomeLoading() {
  return (
    <div className="container py-4" role="status" aria-label="Loading your feed">
      <div className="home-grid">
        <div className="home-left"><div className="side-card"><Skeleton height={64} className="mb-3" /><Skeleton height={16} width="60%" /></div></div>
        <div className="home-center d-grid gap-3">
          <div className="feed-card"><Skeleton height={44} /></div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="feed-card"><Skeleton height={16} width="40%" className="mb-3" /><Skeleton height={14} className="mb-2" /><Skeleton height={14} width="85%" className="mb-3" /><Skeleton height={140} /></div>
          ))}
        </div>
        <div className="home-right"><div className="side-card"><Skeleton height={16} width="50%" className="mb-3" /><Skeleton height={60} className="mb-2" /><Skeleton height={60} /></div></div>
      </div>
    </div>
  );
}
