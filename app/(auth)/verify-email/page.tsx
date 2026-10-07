import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";
import { getSignupEmail } from "@/lib/auth/request";
import { maskEmail } from "@/lib/auth/otp";
import { signupService } from "@/services/auth/signup.service";

export const metadata: Metadata = { title: "Verify your email" };
export const dynamic = "force-dynamic";

export default async function VerifyEmailPage() {
  const email = await getSignupEmail();
  const status = email ? await signupService.status(email) : null;
  if (!email || !status) redirect("/register"); // no pending sign-up (or it expired): start again
  return <VerifyEmailForm maskedEmail={maskEmail(email)} resendAt={status.resendAt} expiresAt={status.expiresAt} />;
}
