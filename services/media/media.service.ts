import { enforceRateLimit } from "@/lib/rate-limit";
import { deleteMedia, getOptimizedUrl, replaceMedia } from "@/lib/storage/cloudinary";
import { mediaRepository, type UserImageKind } from "@/repositories/media.repository";
import { MAX_IMAGE_BYTES, validateImageFile } from "./image-validation";

const FOLDER = { avatar: "jobsync/users/avatars", cover: "jobsync/users/covers" } as const;

export const mediaService = {
  /** Optimised, display-ready URLs. The original full-size asset is never sent to the browser. */
  async getUserImageUrls(userId: string) {
    const { avatar, cover } = await mediaRepository.getUserImages(userId);
    return {
      avatarUrl: avatar ? getOptimizedUrl(avatar.url, "avatar") : null,
      avatarSmUrl: avatar ? getOptimizedUrl(avatar.url, "avatarSm") : null,
      coverUrl: cover ? getOptimizedUrl(cover.url, "cover") : null,
    };
  },

  /**
   * Validate -> upload -> save Media row + profile reference -> delete the previous asset.
   * `userId` must come from the session; users can only ever change their own images.
   */
  async setUserImage(userId: string, kind: UserImageKind, file: File) {
    enforceRateLimit(userId, "upload");
    const image = await validateImageFile(file, MAX_IMAGE_BYTES[kind]);
    const current = await mediaRepository.getUserImages(userId);
    const previous = kind === "avatar" ? current.avatar : current.cover;

    const media = await replaceMedia({
      previousPublicId: previous?.publicId ?? null,
      upload: { buffer: image.buffer, mimeType: image.mimeType, folder: FOLDER[kind], ownerKey: userId },
      commit: (asset) =>
        mediaRepository.attachUserImage(userId, kind, {
          url: asset.url,
          publicId: asset.publicId,
          mimeType: image.mimeType,
          width: asset.width,
          height: asset.height,
          bytes: asset.bytes,
          resourceType: asset.resourceType,
        }),
    });
    return { url: getOptimizedUrl(media.url, kind === "avatar" ? "avatar" : "cover") };
  },

  async removeUserImage(userId: string, kind: UserImageKind) {
    const publicId = await mediaRepository.detachUserImage(userId, kind);
    if (publicId) await deleteMedia(publicId);
  },
};
