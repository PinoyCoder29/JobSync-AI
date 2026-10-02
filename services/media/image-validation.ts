import { AppError } from "@/lib/errors";

export const ALLOWED_IMAGE_TYPES = { "image/jpeg": ["jpg", "jpeg"], "image/png": ["png"], "image/webp": ["webp"] } as const;
export const MAX_IMAGE_BYTES = { avatar: 5 * 1024 * 1024, cover: 5 * 1024 * 1024, post: 10 * 1024 * 1024 } as const;

/** Checks the real file header, so a renamed .exe (or a lying Content-Type header) cannot get through. */
export function sniffImageType(bytes: Uint8Array): keyof typeof ALLOWED_IMAGE_TYPES | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return "image/png";
  if (bytes.length >= 12) {
    const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
    if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  }
  return null;
}

export type ValidatedImage = { buffer: Buffer; mimeType: keyof typeof ALLOWED_IMAGE_TYPES };

/** Server-side validation of MIME type, extension, size and magic bytes. */
export function validateImageFile(file: { name: string; type: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> }, maxBytes: number) {
  return (async (): Promise<ValidatedImage> => {
    if (file.size === 0) throw new AppError("That file is empty.");
    if (file.size > maxBytes) throw new AppError(`Image is too large. The maximum size is ${Math.round(maxBytes / 1024 / 1024)} MB.`);

    const declared = file.type as keyof typeof ALLOWED_IMAGE_TYPES;
    const allowedExtensions = ALLOWED_IMAGE_TYPES[declared];
    if (!allowedExtensions) throw new AppError("Only JPEG, PNG or WEBP images are allowed.");

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!(allowedExtensions as readonly string[]).includes(extension)) throw new AppError("The file extension does not match the image type.");

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > maxBytes) throw new AppError(`Image is too large. The maximum size is ${Math.round(maxBytes / 1024 / 1024)} MB.`);

    const actual = sniffImageType(buffer);
    if (actual !== declared) throw new AppError("That file doesn't look like a valid image.");
    return { buffer, mimeType: actual };
  })();
}
