import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/AuthForms";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { safeRedirectPath } from "@/lib/action-utils";

export const metadata: Metadata = { title: "Log in" };

const ERRORS: Record<string, string> = {
  OAuthAccountNotLinked: "That email is already registered with a different sign-in method. Log in the way you signed up first.",
  AccessDenied: "We couldn't get an email address from that account. Allow email access, or sign up with email instead.",
  Configuration: "That sign-in option isn't available right now. Use another method.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  const { callbackUrl, error } = await searchParams;
  const target = safeRedirectPath(callbackUrl ?? null);
  return (
    <>
      <h1 className="page-title h3">Welcome back</h1>
      <p className="text-muted">Log in to continue your job search.</p>
      {error && <div className="alert alert-danger" role="alert">{ERRORS[error] ?? "Sign-in failed. Please try again."}</div>}
      <OAuthButtons callbackUrl={target} />
      <LoginForm callbackUrl={target} />
    </>
  );
}
