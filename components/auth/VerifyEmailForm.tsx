"use client";

import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { changeSignupEmailAction, resendOtpAction, verifyEmailAction } from "@/app/actions/auth.actions";
import type { ActionState } from "@/types";

const LEN = 6;
const TTL_MS = 5 * 60_000;
const secondsLeft = (ts: number, now: number) => Math.max(0, Math.ceil((ts - now) / 1000));

/**
 * 6-box code entry: paste a whole code, digits auto-advance, Backspace walks back, auto-submits at 6 digits.
 * Shows distinct states for: wrong code, expired / locked code, resend cooldown and success.
 */
export function VerifyEmailForm({ maskedEmail, resendAt: initialResendAt, expiresAt: initialExpiresAt }: { maskedEmail: string; resendAt: number; expiresAt: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(verifyEmailAction, {});
  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(""));
  const [resendAt, setResendAt] = useState(initialResendAt);
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);
  const [info, setInfo] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [resending, startResend] = useTransition();
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef("");
  const code = digits.join("");

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const expired = now >= expiresAt || state.code === "EXPIRED" || state.code === "LOCKED";
  const wrong = state.ok === false && state.code === "INVALID_CODE";
  const cooldown = secondsLeft(resendAt, now);

  const focusBox = (i: number) => boxes.current[Math.max(0, Math.min(LEN - 1, i))]?.focus();

  // After any failed attempt: clear the boxes and put the cursor back on the first one.
  useEffect(() => {
    if (state.ok === false) {
      setDigits(Array(LEN).fill(""));
      submitted.current = "";
      focusBox(0);
    }
  }, [state]);

  // Auto-submit once all six digits are in (once per distinct code).
  useEffect(() => {
    if (code.length === LEN && !pending && !expired && submitted.current !== code) {
      submitted.current = code;
      formRef.current?.requestSubmit();
    }
  }, [code, pending, expired]);

  const fill = useCallback((from: number, raw: string) => {
    const chars = raw.replace(/\D/g, "").slice(0, LEN - from).split("");
    if (chars.length === 0) return;
    setDigits((prev) => {
      const next = [...prev];
      chars.forEach((c, k) => (next[from + k] = c));
      return next;
    });
    focusBox(from + chars.length);
  }, []);

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) setDigits((p) => p.map((d, k) => (k === i ? "" : d)));
      else if (i > 0) { setDigits((p) => p.map((d, k) => (k === i - 1 ? "" : d))); focusBox(i - 1); }
    } else if (e.key === "ArrowLeft") { e.preventDefault(); focusBox(i - 1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); focusBox(i + 1); }
  }

  function resend() {
    setInfo(null);
    setResendError(null);
    startResend(async () => {
      const r = await resendOtpAction();
      if (r.ok) {
        setResendAt(r.resendAt ?? Date.now() + 60_000);
        setExpiresAt(Date.now() + TTL_MS);
        setDigits(Array(LEN).fill(""));
        submitted.current = "";
        setInfo("We sent a new code. The old one no longer works.");
        focusBox(0);
      } else {
        setResendError(r.message ?? "We couldn't resend the code.");
      }
    });
  }

  if (state.ok) return <p className="otp-success" role="status"><i className="bi bi-check-circle-fill me-2" aria-hidden="true" />Email verified. Signing you in…</p>;

  const message = expired ? (state.code === "LOCKED" ? "Too many incorrect attempts. Request a new code." : "This code has expired. Request a new one.") : state.ok === false ? state.message : null;

  return (
    <div className="otp">
      <h1 className="page-title h3">Verify your email</h1>
      <p className="text-muted mb-4">We sent a 6-digit code to <strong className="text-break">{maskedEmail}</strong>.</p>

      <form ref={formRef} action={action} noValidate>
        <input type="hidden" name="code" value={code} />
        <div className={`otp-boxes ${wrong ? "otp-shake" : ""}`} role="group" aria-label="6-digit verification code" onPaste={(e) => { e.preventDefault(); fill(0, e.clipboardData.getData("text")); }}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { boxes.current[i] = el; }}
              className={`otp-box ${message && !expired ? "is-invalid" : ""}`}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={LEN}
              value={d}
              aria-label={`Digit ${i + 1}`}
              aria-invalid={Boolean(message && !expired)}
              disabled={pending || expired}
              autoFocus={i === 0}
              onChange={(e) => fill(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              onFocus={(e) => e.target.select()}
            />
          ))}
        </div>

        <div className="otp-status" aria-live="polite">
          {message && <p role="alert" className={`mb-2 ${expired ? "text-warning-emphasis" : "text-danger"}`}>{message}</p>}
          {info && !message && <p className="text-success mb-2">{info}</p>}
          {!expired && !message && <p className="small text-muted mb-2">Code expires in {Math.floor(secondsLeft(expiresAt, now) / 60)}:{String(secondsLeft(expiresAt, now) % 60).padStart(2, "0")}</p>}
        </div>

        <button type="submit" className="btn btn-brand w-100" disabled={pending || expired || code.length !== LEN}>{pending ? "Verifying…" : "Verify email"}</button>
      </form>

      <div className="otp-resend text-center mt-3">
        <p className="small text-muted mb-1">Didn&apos;t receive it? Check your spam folder.</p>
        <button type="button" className={`btn btn-sm ${expired ? "btn-brand" : "btn-link"}`} onClick={resend} disabled={cooldown > 0 || resending}>
          {resending ? "Sending…" : cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </button>
        {resendError && <p role="alert" className="small text-danger mb-0">{resendError}</p>}
      </div>

      <form action={changeSignupEmailAction} className="text-center mt-2">
        <button type="submit" className="btn btn-link btn-sm text-muted">Wrong email? Start over</button>
      </form>
    </div>
  );
}
