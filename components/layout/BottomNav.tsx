"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_TABS, isActivePath } from "./nav";
import { formatBadge, useUnreadCounts } from "./UnreadCounts";

/** Mobile bottom navigation: Home, Jobs, Network, Messages, Profile. */
export function BottomNav() {
  const pathname = usePathname();
  const { counts } = useUnreadCounts();
  return (
    <nav className="bottom-nav d-lg-none" aria-label="Primary">
      {MOBILE_TABS.map((t) => {
        const active = isActivePath(pathname, t.href);
        const badge = t.href === "/messages" ? counts.messages : 0;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`bottom-nav-link ${active ? "active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className="bottom-nav-icon">
              <i
                className={`bi ${t.icon}${active ? "-fill" : ""}`}
                aria-hidden="true"
              />
              {badge > 0 && (
                <span
                  className="bottom-nav-badge"
                  aria-label={`${badge} unread`}
                >
                  {formatBadge(badge)}
                </span>
              )}
            </span>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
