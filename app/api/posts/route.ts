import { fail, handleApiError, ok } from "@/lib/api-response";
import { authenticate, readJson } from "@/lib/api-route";
import { createPostSchema, MAX_POST_IMAGES } from "@/lib/validations/post";
import { postService } from "@/services/social/post.service";

export const runtime = "nodejs";

const text = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : undefined);

/**
 * POST /api/posts
 *  - multipart/form-data: content, postType, visibility, title, linkUrl, jobId, images (up to 4 files)
 *  - application/json: the same fields without images
 */
export async function POST(req: Request) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;

    let raw: unknown;
    let files: File[] = [];
    if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      const form = await req.formData();
      raw = { content: text(form.get("content")), postType: text(form.get("postType")), visibility: text(form.get("visibility")), title: text(form.get("title")), linkUrl: text(form.get("linkUrl")), jobId: text(form.get("jobId")) };
      files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
      if (files.length > MAX_POST_IMAGES) return fail("VALIDATION", `You can add up to ${MAX_POST_IMAGES} images.`);
    } else {
      raw = await readJson(req);
    }
    const parsed = createPostSchema.safeParse(raw);
    if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Check your post and try again.");
    return ok(await postService.create(a.userId!, parsed.data, files), undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
