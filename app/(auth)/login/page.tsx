import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/AuthForms";
import { safeRedirectPath } from "@/lib/action-utils";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  return (
    <>
      <h1 className="page-title h3">Welcome back</h1>
      <p className="text-muted">Log in to continue your job search.</p>
      <LoginForm callbackUrl={safeRedirectPath(callbackUrl ?? null)} />
    </>
  );
}
