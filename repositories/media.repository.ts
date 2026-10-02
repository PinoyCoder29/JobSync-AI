import type { MediaKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type UserImageKind = "avatar" | "cover";

const FIELD = { avatar: "avatarMediaId", cover: "coverMediaId" } as const;
const KIND: Record<UserImageKind, MediaKind> = { avatar: "USER_AVATAR", cover: "USER_COVER" };

export const mediaRepository = {
  /** Current avatar and cover (url + publicId) for a user. */
  async getUserImages(userId: string) {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        avatarMedia: { select: { id: true, url: true, publicId: true } },
        coverMedia: { select: { id: true, url: true, publicId: true } },
      },
    });
    return { avatar: profile?.avatarMedia ?? null, cover: profile?.coverMedia ?? null };
  },

  /** Creates the Media row, points the profile at it and removes the previous Media row, in one transaction. */
  attachUserImage(userId: string, kind: UserImageKind, asset: { url: string; publicId: string; mimeType: string; width: number | null; height: number | null; bytes: number; resourceType: string }) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.profile.findUnique({ where: { userId }, select: { avatarMediaId: true, coverMediaId: true } });
      const previousId = existing?.[FIELD[kind]] ?? null;

      const media = await tx.media.create({
        data: {
          url: asset.url,
          publicId: asset.publicId,
          resourceType: asset.resourceType,
          mimeType: asset.mimeType,
          width: asset.width,
          height: asset.height,
          size: asset.bytes,
          kind: KIND[kind],
          ownerId: userId,
        },
      });
      await tx.profile.upsert({
        where: { userId },
        create: { userId, [FIELD[kind]]: media.id },
        update: { [FIELD[kind]]: media.id },
      });
      if (previousId) await tx.media.deleteMany({ where: { id: previousId, ownerId: userId } });
      return media;
    });
  },

  /** Clears the profile reference and deletes the Media row (owner-checked). Returns the removed publicId, if any. */
  async detachUserImage(userId: string, kind: UserImageKind): Promise<string | null> {
    return prisma.$transaction(async (tx) => {
      const profile = await tx.profile.findUnique({ where: { userId }, select: { avatarMedia: { select: { id: true, publicId: true } }, coverMedia: { select: { id: true, publicId: true } } } });
      const media = kind === "avatar" ? profile?.avatarMedia : profile?.coverMedia;
      if (!media) return null;
      await tx.profile.update({ where: { userId }, data: { [FIELD[kind]]: null } });
      await tx.media.deleteMany({ where: { id: media.id, ownerId: userId } });
      return media.publicId;
    });
  },
};
