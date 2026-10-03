"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_TABS, isActivePath } from "./nav";

/** Mobile bottom navigation: Home, Jobs, Network, Messages, Profile. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="bottom-nav d-lg-none" aria-label="Primary">
      {MOBILE_TABS.map((t) => {
        const active = isActivePath(pathname, t.href);
        return (
          <Link key={t.href} href={t.href} className={`bottom-nav-link ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
            <i className={`bi ${t.icon}${active ? "-fill" : ""}`} aria-hidden="true" />
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
