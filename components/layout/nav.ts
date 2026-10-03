export type NavItem = { href: string; label: string; icon: string; short?: string };

/** Desktop top bar, left to right. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: "bi-house-door" },
  { href: "/jobs", label: "Find Jobs", icon: "bi-search" },
  { href: "/network", label: "Network", icon: "bi-people" },
  { href: "/messages", label: "Messages", icon: "bi-chat-dots" },
  { href: "/notifications", label: "Notifications", icon: "bi-bell" },
];

export const CAREER_NAV: NavItem[] = [
  { href: "/resume", label: "Resume", icon: "bi-file-earmark-person" },
  { href: "/applications", label: "Applications", icon: "bi-kanban" },
  { href: "/assistant", label: "AI Career Assistant", icon: "bi-stars" },
];

/** Everything else lives under "More" so the top bar stays calm. */
export const MORE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "bi-grid-1x2" },
  { href: "/saved-jobs", label: "Saved Jobs", icon: "bi-bookmark" },
  { href: "/saved-posts", label: "Saved Posts", icon: "bi-bookmark-heart" },
  { href: "/resume-analyzer", label: "Resume Analyzer", icon: "bi-file-earmark-check" },
  { href: "/ats-checker", label: "ATS Checker", icon: "bi-check2-square" },
  { href: "/skill-analysis", label: "Skills", icon: "bi-bar-chart-steps" },
  { href: "/interview", label: "Interview Prep", icon: "bi-chat-square-text" },
  { href: "/settings", label: "Settings", icon: "bi-gear" },
];

/** Mobile bottom bar. */
export const MOBILE_TABS: NavItem[] = [
  { href: "/", label: "Home", icon: "bi-house-door" },
  { href: "/jobs", label: "Jobs", icon: "bi-search" },
  { href: "/network", label: "Network", icon: "bi-people" },
  { href: "/messages", label: "Messages", icon: "bi-chat-dots" },
  { href: "/profile", label: "Profile", icon: "bi-person" },
];

/** Full list for the mobile drawer. */
export const NAV_ITEMS: NavItem[] = [
  ...PRIMARY_NAV,
  ...CAREER_NAV,
  { href: "/profile", label: "Profile", icon: "bi-person" },
  ...MORE_NAV,
];

export const isActivePath = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
