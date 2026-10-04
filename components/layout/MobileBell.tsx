"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatBadge, useUnreadCounts } from "./UnreadCounts";

/**
 * Notification bell for the TOP header on small screens, sitting right beside the profile avatar.
 * (On desktop the bell lives in the top navigation instead, so this is hidden from lg up.)
 */
export function MobileBell() {
  const pathname = usePathname();
  const { counts } = useUnreadCounts();
  const n = counts.notifications;
  const active = pathname === "/notifications";
  return (
    <Link href="/notifications" className={`header-icon-btn d-lg-none ${active ? "active" : ""}`} aria-label={n > 0 ? `Notifications, ${n} unread` : "Notifications"} aria-current={active ? "page" : undefined}>
      <i className={`bi ${active || n > 0 ? "bi-bell-fill" : "bi-bell"}`} aria-hidden="true" />
      {n > 0 && <span className="header-icon-badge" aria-hidden="true">{formatBadge(n)}</span>}
    </Link>
  );
}
