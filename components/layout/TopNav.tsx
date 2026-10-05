"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CAREER_NAV,
  MORE_NAV,
  PRIMARY_NAV,
  isActivePath,
  type NavItem,
} from "./nav";
import { formatBadge, useUnreadCounts } from "./UnreadCounts";

function Item({
  item,
  pathname,
  badge,
}: {
  item: NavItem;
  pathname: string;
  badge?: number;
}) {
  const active = isActivePath(pathname, item.href);
  return (
    <Link
      href={item.href}
      title={item.label}
      className={`topnav-link ${active ? "active" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <span className="topnav-icon">
        <i className={`bi ${item.icon}`} aria-hidden="true" />
        {badge ? (
          <span className="topnav-badge" aria-label={`${badge} unread`}>
            {formatBadge(badge)}
          </span>
        ) : null}
      </span>
      <span className="topnav-label">{item.label}</span>
    </Link>
  );
}

/** Desktop navigation: Home, Find Jobs, Network, Messages, Notifications | Resume, Applications, AI | Profile, More. */
export function TopNav() {
  const pathname = usePathname();
  const { counts } = useUnreadCounts();
  const moreActive = MORE_NAV.some((i) => isActivePath(pathname, i.href));
  return (
    <nav className="topnav" aria-label="Main">
      {PRIMARY_NAV.map((item) => (
        <Item
          key={item.href}
          item={item}
          pathname={pathname}
          badge={
            item.href === "/notifications"
              ? counts.notifications
              : item.href === "/messages"
                ? counts.messages
                : undefined
          }
        />
      ))}
      <span className="topnav-sep" aria-hidden="true" />
      {CAREER_NAV.map((item) => (
        <Item key={item.href} item={item} pathname={pathname} />
      ))}
      <span className="topnav-sep" aria-hidden="true" />
      <Item
        item={{ href: "/profile", label: "Profile", icon: "bi-person" }}
        pathname={pathname}
      />
      <details className="topnav-more">
        <summary className={`topnav-link ${moreActive ? "active" : ""}`}>
          <span className="topnav-icon">
            <i className="bi bi-three-dots" aria-hidden="true" />
          </span>
          <span className="topnav-label">More</span>
        </summary>
        <div className="topnav-more-panel">
          {MORE_NAV.map((i) => (
            <Link key={i.href} href={i.href} className="dropdown-item">
              <i className={`bi ${i.icon} me-2`} aria-hidden="true" />
              {i.label}
            </Link>
          ))}
        </div>
      </details>
    </nav>
  );
}
