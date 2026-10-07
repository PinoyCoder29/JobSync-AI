import { prisma } from "@/lib/prisma";

const SELECT = { id: true, email: true, name: true, passwordHash: true, codeHash: true, codeExpiresAt: true, attempts: true, lastSentAt: true, sendCount: true, expiresAt: true } as const;

export const pendingSignupRepository = {
  find: (email: string) => prisma.pendingSignup.findUnique({ where: { email }, select: SELECT }),
  purgeExpired: () => prisma.pendingSignup.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
  upsertFresh(d: { email: string; name: string; passwordHash: string; codeHash: string; codeExpiresAt: Date; expiresAt: Date }) {
    const now = new Date();
    return prisma.pendingSignup.upsert({
      where: { email: d.email },
      create: { ...d, lastSentAt: now },
      update: { ...d, attempts: 0, sendCount: 1, lastSentAt: now },
      select: SELECT,
    });
  },
  /** Re-submitting the form inside the resend cooldown updates who/what, but keeps the code that was already emailed. */
  updateIdentity: (email: string, name: string, passwordHash: string) => prisma.pendingSignup.update({ where: { email }, data: { name, passwordHash }, select: SELECT }),
  rotateCode: (email: string, codeHash: string, codeExpiresAt: Date) =>
    prisma.pendingSignup.update({ where: { email }, data: { codeHash, codeExpiresAt, attempts: 0, lastSentAt: new Date(), sendCount: { increment: 1 } }, select: SELECT }),
  /** Atomic: concurrent wrong guesses cannot race past the attempt limit. */
  recordFailure: (email: string) => prisma.pendingSignup.update({ where: { email }, data: { attempts: { increment: 1 } }, select: { attempts: true } }),
  invalidateCode: (email: string) => prisma.pendingSignup.updateMany({ where: { email }, data: { codeHash: "", codeExpiresAt: new Date(0) } }),
  delete: (email: string) => prisma.pendingSignup.deleteMany({ where: { email } }),
};
