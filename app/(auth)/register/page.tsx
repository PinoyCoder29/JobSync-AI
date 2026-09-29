import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="page-title h3">Create your account</h1>
      <p className="text-muted">Start tracking jobs, resumes and applications.</p>
      <RegisterForm />
    </>
  );
}
