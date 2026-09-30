import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page">
      <div className="position-absolute top-0 end-0 p-3"><ThemeToggle /></div>
      <Link href="/" className="brand mb-4">JobSync <span className="brand-ai">AI</span></Link>
      <div className="auth-card">{children}</div>
    </div>
  );
}
