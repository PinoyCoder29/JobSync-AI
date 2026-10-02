import { auth } from "@/auth";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { isSameOrigin } from "@/lib/http";
import { mediaKindSchema } from "@/lib/validations/media";
import { mediaService } from "@/services/media/media.service";

export const runtime = "nodejs";

async function authenticate(req: Request) {
  if (!isSameOrigin(req)) return { error: fail("FORBIDDEN", "Cross-site requests are not allowed.") };
  const session = await auth();
  if (!session?.user?.id) return { error: fail("UNAUTHORIZED", "Please sign in to continue.") };
  return { userId: session.user.id };
}

/** POST multipart/form-data: kind=avatar|cover, file=<image>. Replaces the current image. */
export async function POST(req: Request) {
  try {
    const result = await authenticate(req);
    if ("error" in result) return result.error;

    const form = await req.formData();
    const kind = mediaKindSchema.safeParse(form.get("kind"));
    const file = form.get("file");
    if (!kind.success) return fail("VALIDATION", "Choose whether this is an avatar or a cover image.");
    if (!(file instanceof File)) return fail("VALIDATION", "Choose an image to upload.");

    return ok(await mediaService.setUserImage(result.userId, kind.data, file), undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE ?kind=avatar|cover. Removes the current image. */
export async function DELETE(req: Request) {
  try {
    const result = await authenticate(req);
    if ("error" in result) return result.error;

    const kind = mediaKindSchema.safeParse(new URL(req.url).searchParams.get("kind"));
    if (!kind.success) return fail("VALIDATION", "Choose whether this is an avatar or a cover image.");

    await mediaService.removeUserImage(result.userId, kind.data);
    return ok({ removed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
