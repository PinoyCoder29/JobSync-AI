import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container py-5 text-center">
      <h1 className="page-title">Page not found</h1>
      <p className="text-muted">The page you are looking for doesn't exist or has been moved.</p>
      <Link href="/jobs" className="btn btn-brand">Browse jobs</Link>
    </div>
  );
}
