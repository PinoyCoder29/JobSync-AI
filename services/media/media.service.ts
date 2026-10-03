import { enforceRateLimit } from "@/lib/rate-limit";
import { deleteMedia, getOptimizedUrl, replaceMedia, uploadMedia, type UploadedAsset } from "@/lib/storage/cloudinary";
import { AppError } from "@/lib/errors";
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

  /**
   * Validates every file (type, extension, size, magic bytes) BEFORE anything is uploaded, then uploads to Cloudinary.
   * If any upload fails, the ones that already succeeded are removed, so nothing is orphaned.
   * Only metadata is returned for PostgreSQL; the binaries live on Cloudinary.
   */
  async uploadPostImages(userId: string, files: File[]): Promise<(UploadedAsset & { mimeType: string })[]> {
    if (files.length === 0) return [];
    const validated = [];
    for (const file of files) validated.push(await validateImageFile(file, MAX_IMAGE_BYTES.post));

    const settled = await Promise.allSettled(
      validated.map((image) => uploadMedia({ buffer: image.buffer, mimeType: image.mimeType, folder: "jobsync/posts", ownerKey: userId }).then((asset) => ({ ...asset, mimeType: image.mimeType }))),
    );
    const ok = settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    if (ok.length !== settled.length) {
      await Promise.all(ok.map((a) => deleteMedia(a.publicId)));
      const firstError = settled.find((r) => r.status === "rejected") as PromiseRejectedResult;
      throw firstError.reason instanceof AppError ? firstError.reason : new AppError("We couldn't upload your images. Please try again.");
    }
    return ok;
  },

  /** Best-effort removal of Cloudinary assets after their database rows are gone. */
  async deleteAssets(publicIds: string[]) {
    await Promise.all(publicIds.map((id) => deleteMedia(id)));
  },
};
