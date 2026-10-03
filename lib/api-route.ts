import { auth } from "@/auth";
import { fail } from "@/lib/api-response";
import { isSameOrigin } from "@/lib/http";

/**
 * Shared guard for cookie-authenticated API routes.
 *  - mutating requests must be same-origin (CSRF protection)
 *  - identity comes ONLY from the server session, never from the request body
 */
export async function authenticate(req: Request, opts: { mutating: boolean; optional?: boolean }): Promise<{ userId: string | null } | { error: Response }> {
  if (opts.mutating && !isSameOrigin(req)) return { error: fail("FORBIDDEN", "Cross-site requests are not allowed.") };
  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (!userId && !opts.optional) return { error: fail("UNAUTHORIZED", "Please sign in to continue.") };
  return { userId };
}

/** Parses a JSON body; an empty or invalid body becomes `{}` so schema validation reports the real problem. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export type RouteCtx<P extends Record<string, string>> = { params: Promise<P> };
