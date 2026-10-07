import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import {
  OTP_MAX_ATTEMPTS, OTP_MAX_SENDS, OTP_RESEND_COOLDOWN_MS, OTP_TTL_MS, PENDING_TTL_MS, checkPending, generateOtp, hashOtp, otpMatches, resendWaitMs,
} from "@/lib/auth/otp";
import { createSignupTicket } from "@/lib/auth/signup-ticket";
import { enforceRateLimit } from "@/lib/rate-limit";
import { pendingSignupRepository as pending } from "@/repositories/pending-signup.repository";
import { prisma } from "@/lib/prisma";
import { userRepository } from "@/repositories/user.repository";
import { emailService } from "@/services/email/email.service";

const ROUNDS = 12;
const minutes = Math.round(OTP_TTL_MS / 60_000);

export type SignupStatus = { email: string; name: string; resendAt: number; expiresAt: number; locked: boolean };

const toStatus = (p: NonNullable<Awaited<ReturnType<typeof pending.find>>>): SignupStatus => ({
  email: p.email,
  name: p.name,
  resendAt: p.lastSentAt.getTime() + OTP_RESEND_COOLDOWN_MS,
  expiresAt: p.codeExpiresAt.getTime(),
  locked: p.attempts >= OTP_MAX_ATTEMPTS || !p.codeHash,
});

export const signupService = {
  /** Step 1: remember the sign-up (NOT a user yet), email a code. */
  async start(input: { name: string; email: string; password: string }, ip: string): Promise<SignupStatus> {
    enforceRateLimit(`ip:${ip}`, "signupStartIp");
    enforceRateLimit(`email:${input.email}`, "signupStartEmail");
    await pending.purgeExpired().catch(() => undefined);

    if (await userRepository.findByEmailWithHash(input.email)) throw new AppError("An account with this email already exists.", "CONFLICT");
    const passwordHash = await bcrypt.hash(input.password, ROUNDS);

    const existing = await pending.find(input.email);
    if (existing && resendWaitMs(existing.lastSentAt) > 0 && checkPending(existing) === "OPEN") {
      // Same person resubmitting right away: keep the code already in their inbox, don't send another.
      return toStatus(await pending.updateIdentity(input.email, input.name, passwordHash));
    }

    const code = generateOtp();
    const record = await pending.upsertFresh({
      email: input.email, name: input.name, passwordHash,
      codeHash: hashOtp(input.email, code),
      codeExpiresAt: new Date(Date.now() + OTP_TTL_MS),
      expiresAt: new Date(Date.now() + PENDING_TTL_MS),
    });
    try {
      await emailService.sendOtp(input.email, input.name, code, minutes);
    } catch (error) {
      await pending.delete(input.email); // nothing was delivered, so don't leave a dead code or burn a cooldown
      throw error;
    }
    return toStatus(record);
  },

  async status(email: string): Promise<SignupStatus | null> {
    const p = await pending.find(email);
    return p && p.expiresAt > new Date() ? toStatus(p) : null;
  },

  /** Resend: cooldown + per-sign-up cap + hourly cap. Old code stops working the moment a new one is issued. */
  async resend(email: string): Promise<SignupStatus> {
    enforceRateLimit(`email:${email}`, "otpSend");
    const p = await pending.find(email);
    if (!p || p.expiresAt <= new Date()) throw new AppError("Your sign-up has expired. Please start again.", "NOT_FOUND");
    const wait = resendWaitMs(p.lastSentAt);
    if (wait > 0) throw new AppError(`Please wait ${Math.ceil(wait / 1000)} seconds before requesting another code.`, "RATE_LIMITED");
    if (p.sendCount >= OTP_MAX_SENDS) throw new AppError("You've requested too many codes. Please start the sign-up again later.", "RATE_LIMITED");

    const code = generateOtp();
    const record = await pending.rotateCode(email, hashOtp(email, code), new Date(Date.now() + OTP_TTL_MS));
    await emailService.sendOtp(email, p.name, code, minutes);
    return toStatus(record);
  },

  /** Step 2: check the code. On success the code row is deleted (one-time use) and the real, verified User is created. */
  async verify(email: string, code: string): Promise<{ userId: string; ticket: string }> {
    enforceRateLimit(`email:${email}`, "otpVerify");
    const p = await pending.find(email);
    if (!p) throw new AppError("Your sign-up has expired. Please start again.", "NOT_FOUND");

    const state = checkPending(p);
    if (state === "EXPIRED") throw new AppError("That code has expired. Request a new one.", "EXPIRED");
    if (state === "LOCKED") throw new AppError("Too many incorrect attempts. Request a new code.", "LOCKED");

    if (!otpMatches(email, code, p.codeHash)) {
      const { attempts } = await pending.recordFailure(email);
      if (attempts >= OTP_MAX_ATTEMPTS) {
        await pending.invalidateCode(email);
        throw new AppError("Too many incorrect attempts. Request a new code.", "LOCKED");
      }
      throw new AppError(`That code isn't right. ${OTP_MAX_ATTEMPTS - attempts} ${OTP_MAX_ATTEMPTS - attempts === 1 ? "try" : "tries"} left.`, "INVALID_CODE");
    }

    try {
      const user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: { name: p.name, email, passwordHash: p.passwordHash, emailVerified: new Date(), profile: { create: {} } },
          select: { id: true },
        });
        await tx.pendingSignup.deleteMany({ where: { email } }); // invalidates the code for good
        return created;
      });
      return { userId: user.id, ticket: createSignupTicket(user.id) };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AppError("An account with this email already exists.", "CONFLICT");
      throw error;
    }
  },

  cancel: (email: string) => pending.delete(email),
};
