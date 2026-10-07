import nodemailer, { type Transporter } from "nodemailer";
import { AppError } from "@/lib/errors";

/**
 * Gmail SMTP with an App Password (NOT the normal Gmail password).
 * Needs 2-Step Verification on the Google account, then Google Account -> Security -> App passwords.
 * Credentials come only from the server environment and are never sent to the browser.
 */
export const isEmailConfigured = () => Boolean(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD);

let transporter: Transporter | null = null;
function getTransporter(): Transporter {
  if (!isEmailConfigured()) throw new AppError("Email sending isn't set up on this server yet (EMAIL_USER / EMAIL_APP_PASSWORD).");
  return (transporter ??= nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD },
  }));
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function otpEmailContent(name: string, code: string, minutes: number) {
  const first = escapeHtml(name.trim().split(/\s+/)[0] || "there");
  return {
    subject: `${code} is your JobSync AI verification code`,
    text: `Hi ${name.trim().split(/\s+/)[0] || "there"},\n\nYour JobSync AI verification code is ${code}.\nIt expires in ${minutes} minutes and can be used once.\n\nIf you didn't create an account, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#222">
<h2 style="margin:0 0 12px">Verify your email</h2>
<p>Hi ${first}, use this code to finish creating your JobSync AI account:</p>
<p style="font-size:34px;letter-spacing:10px;font-weight:700;margin:20px 0;color:#c2410c">${code}</p>
<p style="color:#555">It expires in ${minutes} minutes and can only be used once. If you didn't sign up, you can ignore this email.</p></div>`,
  };
}

export const emailService = {
  async sendOtp(to: string, name: string, code: string, minutes: number): Promise<void> {
    const content = otpEmailContent(name, code, minutes);
    try {
      await getTransporter().sendMail({ from: `"${process.env.EMAIL_FROM_NAME || "JobSync AI"}" <${process.env.EMAIL_USER}>`, to, ...content });
    } catch (error) {
      if (error instanceof AppError) throw error;
      // Log the failure class only: never the code, the recipient, or credentials.
      console.error("OTP email failed:", (error as { code?: string }).code ?? (error as Error).name);
      throw new AppError("We couldn't send the verification email. Please try again in a moment.");
    }
  },
};
