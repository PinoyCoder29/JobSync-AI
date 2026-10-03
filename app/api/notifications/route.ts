import { handleApiError, ok } from "@/lib/api-response";
import { authenticate } from "@/lib/api-route";
import { cursorSchema } from "@/lib/validations/post";
import { notificationService } from "@/services/social/notification.service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const a = await authenticate(req, { mutating: false });
    if ("error" in a) return a.error;
    const cursor = cursorSchema.parse(new URL(req.url).searchParams.get("cursor") ?? undefined);
    const [page, unread] = await Promise.all([notificationService.list(a.userId!, cursor), notificationService.unreadCount(a.userId!)]);
    return ok({ items: page.items, unread }, { nextCursor: page.nextCursor, hasMore: page.hasMore });
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST { id? } — marks one (or all) notifications read. */
export async function POST(req: Request) {
  try {
    const a = await authenticate(req, { mutating: true });
    if ("error" in a) return a.error;
    const body = (await req.json().catch(() => ({}))) as { id?: unknown };
    if (typeof body.id === "string" && body.id.length < 60) await notificationService.markRead(body.id, a.userId!);
    else await notificationService.markAllRead(a.userId!);
    return ok({ unread: await notificationService.unreadCount(a.userId!) });
  } catch (error) {
    return handleApiError(error);
  }
}
