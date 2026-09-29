import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/AuthForms";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="page-title h3">Create your account</h1>
      <p className="text-muted">One click with Google, GitHub or Facebook, or use your email.</p>
      <OAuthButtons />
      <RegisterForm />
    </>
  );
}
