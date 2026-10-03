"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction } from "@/app/actions/auth.actions";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action] = useActionState(loginAction, {});
  return (
    <form action={action} noValidate>
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />
      <Field label="Email" name="email" type="email" state={state} autoComplete="email" required />
      <Field label="Password" name="password" type="password" state={state} autoComplete="current-password" required />
      <div className="mb-3"><FormMessage state={state} /></div>
      <SubmitButton className="btn btn-brand w-100" pendingText="Logging in…">Log in</SubmitButton>
      <p className="text-center small mt-3 mb-0">New to JobSync AI? <Link href="/register">Create an account</Link></p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, {});
  return (
    <form action={action} noValidate>
      <Field label="Full name" name="name" state={state} autoComplete="name" required />
      <Field label="Email" name="email" type="email" state={state} autoComplete="email" required />
      <Field label="Password" name="password" type="password" state={state} autoComplete="new-password" required hint="At least 8 characters with a letter and a number." />
      <Field label="Confirm password" name="confirmPassword" type="password" state={state} autoComplete="new-password" required />
      <div className="mb-3"><FormMessage state={state} /></div>
      <SubmitButton className="btn btn-brand w-100" pendingText="Creating account…">Create account</SubmitButton>
      <p className="text-center small mt-3 mb-0">Already have an account? <Link href="/login">Log in</Link></p>
    </form>
  );
}
