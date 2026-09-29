import { prisma } from "@/lib/prisma";

export const userRepository = {
  /** Includes passwordHash – only for server-side credential checks. Never return this to the client. */
  findByEmailWithHash(email: string) {
    return prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true, passwordHash: true } });
  },
  findByIdWithHash(id: string) {
    return prisma.user.findUnique({ where: { id }, select: { id: true, passwordHash: true } });
  },
  findById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, createdAt: true } });
  },
  createWithProfile(data: { name: string; email: string; passwordHash: string }) {
    return prisma.user.create({
      data: { ...data, profile: { create: {} } },
      select: { id: true, name: true, email: true },
    });
  },
  updatePassword(id: string, passwordHash: string) {
    return prisma.user.update({ where: { id }, data: { passwordHash }, select: { id: true } });
  },
  updateName(id: string, name: string) {
    return prisma.user.update({ where: { id }, data: { name }, select: { id: true } });
  },
};
