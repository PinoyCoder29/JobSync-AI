import type { Metadata } from "next";
import { NotificationList } from "@/components/social/NotificationList";
import { requireUserId } from "@/lib/session";
import { notificationService } from "@/services/social/notification.service";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const userId = await requireUserId();
  const [page, unread] = await Promise.all([
    notificationService.list(userId).catch((e) => { console.error("Notifications failed", e); return null; }),
    notificationService.unreadCount(userId).catch(() => 0),
  ]);
  return (
    <div className="narrow-page">
      <h1 className="page-title">Notifications</h1>
      {!page ? (
        <div className="empty-state error" role="alert"><p className="mb-0">We couldn&apos;t load your notifications. Please refresh to try again.</p></div>
      ) : (
        <NotificationList initial={page.items} initialCursor={page.nextCursor} initialHasMore={page.hasMore} initialUnread={unread} />
      )}
    </div>
  );
}
