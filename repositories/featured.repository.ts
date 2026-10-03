import type { FeaturedCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const featuredRepository = {
  /** Admin/editorial picks that are ACTIVE and inside their date window, best priority first. */
  active(category: FeaturedCategory, take: number, now = new Date()) {
    return prisma.featuredItem.findMany({
      where: {
        category,
        status: "ACTIVE",
        AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take,
      select: { id: true, targetId: true, title: true },
    });
  },
};
