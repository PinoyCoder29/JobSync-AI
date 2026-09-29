import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page">
      <Link href="/" className="brand mb-4">JobSync <span className="brand-ai">AI</span></Link>
      <div className="auth-card">{children}</div>
    </div>
  );
}
