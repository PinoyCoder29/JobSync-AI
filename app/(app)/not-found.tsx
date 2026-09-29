import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty-state">
      <i className="bi bi-search" aria-hidden="true" />
      <h1 className="h5">We couldn't find that</h1>
      <p className="text-muted">It may have been removed, or the link is wrong.</p>
      <Link href="/jobs" className="btn btn-brand">Browse jobs</Link>
    </div>
  );
}
