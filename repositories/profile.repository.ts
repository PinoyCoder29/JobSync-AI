import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const profileRepository = {
  findByUser(userId: string) {
    return prisma.profile.findUnique({ where: { userId } });
  },
  listSkills(userId: string) {
    return prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
      orderBy: [{ level: "desc" }, { skill: { name: "asc" } }],
    });
  },
  /** Updates profile fields, the user's display name and skills atomically. */
  saveAll(userId: string, name: string, data: Omit<Prisma.ProfileUncheckedCreateInput, "userId">, skillNames: string[]) {
    return prisma.$transaction(
      async (tx) => {
        await tx.user.update({ where: { id: userId }, data: { name } });
        await tx.profile.upsert({ where: { userId }, create: { userId, ...data }, update: data });

        const unique = [...new Map(skillNames.map((n) => [n.toLowerCase(), n])).values()];
        const skills = [];
        for (const skillName of unique) {
          skills.push(await tx.skill.upsert({ where: { name: skillName }, create: { name: skillName }, update: {} }));
        }
        await tx.userSkill.deleteMany({ where: { userId, skillId: { notIn: skills.map((s) => s.id) } } });
        await tx.userSkill.createMany({ data: skills.map((s) => ({ userId, skillId: s.id })), skipDuplicates: true });
      },
      { timeout: 15_000 },
    );
  },
  updateSettings(userId: string, data: Prisma.ProfileUpdateInput) {
    return prisma.profile.upsert({ where: { userId }, create: { userId, ...(data as object) }, update: data });
  },
};
