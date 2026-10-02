import { createHash, randomBytes } from "node:crypto";
import { AppError } from "@/lib/errors";

/**
 * Single entry point for Cloudinary. SERVER-ONLY: it reads CLOUDINARY_API_SECRET.
 * Never import this file from a "use client" component.
 *
 * It talks to Cloudinary's REST API directly (signed requests), so no extra npm package is required.
 */

export type CloudinaryFolder =
  | "jobsync/users/avatars"
  | "jobsync/users/covers"
  | "jobsync/posts"
  | "jobsync/companies/logos"
  | "jobsync/companies/covers"
  | "jobsync/projects"
  | "jobsync/communities"
  | "jobsync/events"
  | "jobsync/messages";

export type UploadedAsset = {
  url: string;
  publicId: string;
  width: number | null;
  height: number | null;
  bytes: number;
  format: string | null;
  resourceType: string;
};

type Config = { cloudName: string; apiKey: string; apiSecret: string };

function readConfig(): Config | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
}

export const isCloudinaryConfigured = () => readConfig() !== null;

function requireConfig(): Config {
  const config = readConfig();
  if (!config) {
    console.error("Cloudinary is not configured: set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.");
    throw new AppError("Image uploads are not available right now.", "VALIDATION");
  }
  return config;
}

/** Cloudinary signature: sha1 of the sorted `key=value` pairs joined with `&`, followed by the API secret. */
export function signParams(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .filter((k) => params[k] !== "" && params[k] !== undefined)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(toSign + apiSecret).digest("hex");
}

/** Predictable folder + owner id, plus a short random suffix so a replacement never overwrites (or deletes) the live asset. */
export function buildPublicId(folder: CloudinaryFolder, ownerKey: string): string {
  return `${folder}/${ownerKey}_${randomBytes(4).toString("hex")}`;
}

export async function uploadMedia(input: { buffer: Buffer; mimeType: string; folder: CloudinaryFolder; ownerKey: string }): Promise<UploadedAsset> {
  const { cloudName, apiKey, apiSecret } = requireConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = buildPublicId(input.folder, input.ownerKey);
  const signed = { public_id: publicId, timestamp };

  const form = new FormData();
  form.set("file", new Blob([new Uint8Array(input.buffer)], { type: input.mimeType }), "upload");
  form.set("api_key", apiKey);
  form.set("timestamp", String(timestamp));
  form.set("public_id", publicId);
  form.set("signature", signParams(signed, apiSecret));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(30_000),
  }).catch((error: unknown) => {
    console.error("Cloudinary upload request failed", error);
    throw new AppError("We couldn't upload that image. Please try again.", "VALIDATION");
  });

  if (!response.ok) {
    console.error("Cloudinary upload rejected", response.status, await response.text().catch(() => ""));
    throw new AppError("We couldn't upload that image. Please try again.", "VALIDATION");
  }
  const json = (await response.json()) as Record<string, unknown>;
  return {
    url: String(json.secure_url),
    publicId: String(json.public_id),
    width: typeof json.width === "number" ? json.width : null,
    height: typeof json.height === "number" ? json.height : null,
    bytes: typeof json.bytes === "number" ? json.bytes : input.buffer.length,
    format: typeof json.format === "string" ? json.format : null,
    resourceType: typeof json.resource_type === "string" ? json.resource_type : "image",
  };
}

/** Best-effort: a failed delete is logged but never breaks the user's request. Returns whether it was removed. */
export async function deleteMedia(publicId: string): Promise<boolean> {
  const config = readConfig();
  if (!config) return false;
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const form = new FormData();
    form.set("public_id", publicId);
    form.set("api_key", config.apiKey);
    form.set("timestamp", String(timestamp));
    form.set("invalidate", "true");
    form.set("signature", signParams({ public_id: publicId, timestamp, invalidate: "true" }, config.apiSecret));
    const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(15_000),
    });
    return response.ok;
  } catch (error) {
    console.error("Cloudinary delete failed", publicId, error);
    return false;
  }
}

/**
 * Upload the new asset, let the caller persist it, then remove the previous asset.
 * If persisting fails the freshly uploaded asset is deleted, so nothing is orphaned.
 */
export async function replaceMedia<T>(input: {
  previousPublicId: string | null;
  upload: Parameters<typeof uploadMedia>[0];
  commit: (asset: UploadedAsset) => Promise<T>;
}): Promise<T> {
  const asset = await uploadMedia(input.upload);
  let result: T;
  try {
    result = await input.commit(asset);
  } catch (error) {
    await deleteMedia(asset.publicId);
    throw error;
  }
  if (input.previousPublicId && input.previousPublicId !== asset.publicId) await deleteMedia(input.previousPublicId);
  return result;
}

// ── Transformations (pure, safe to use anywhere) ──

export const IMAGE_PRESETS = {
  avatarSm: "c_fill,g_auto,w_96,h_96,q_auto,f_auto",
  avatar: "c_fill,g_auto,w_256,h_256,q_auto,f_auto",
  cover: "c_fill,g_auto,w_1200,h_300,q_auto,f_auto",
  feed: "c_limit,w_1080,q_auto,f_auto",
} as const;
export type ImagePreset = keyof typeof IMAGE_PRESETS;

/** Inserts a transformation into a Cloudinary delivery URL. Non-Cloudinary URLs are returned untouched. */
export function getOptimizedUrl(url: string, preset: ImagePreset): string {
  const marker = "/image/upload/";
  if (!url.includes("res.cloudinary.com") || !url.includes(marker)) return url;
  return url.replace(marker, `${marker}${IMAGE_PRESETS[preset]}/`);
}
