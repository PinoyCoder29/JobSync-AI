import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";

export function ProfileSummaryCard({
  name,
  headline,
  avatarUrl,
  coverUrl,
}: {
  name: string;
  headline: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
}) {
  return (
    <section className="side-card profile-summary" aria-label="Your profile">
      <div
        className="profile-summary-cover"
        style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}
        aria-hidden="true"
      />
      <Link
        href="/profile"
        className="profile-summary-avatar"
        aria-label="Open your profile"
      >
        <Avatar name={name} src={avatarUrl} size={64} />
      </Link>
      <h2 className="h6 mb-0 mt-2 text-center">{name}</h2>
      <p className="small text-muted text-center mb-2">
        {headline ?? "Add a headline so people know what you do"}
      </p>
      <Link
        href="/profile"
        className="btn btn-soft btn-sm profile-summary-view-btn "
      >
        View profile
      </Link>
    </section>
  );
}

const SHORTCUTS = [
  { href: "/network", icon: "bi-people", label: "My network" },
  { href: "/saved-jobs", icon: "bi-bookmark", label: "Saved jobs" },
  { href: "/saved-posts", icon: "bi-bookmark-heart", label: "Saved posts" },
  { href: "/applications", icon: "bi-kanban", label: "Applications" },
  { href: "/resume", icon: "bi-file-earmark-person", label: "Resume" },
];

export function ShortcutsCard() {
  return (
    <nav className="side-card" aria-label="Shortcuts">
      <h2 className="side-card-title">Shortcuts</h2>
      <ul className="shortcut-list">
        {SHORTCUTS.map((s) => (
          <li key={s.href}>
            <Link href={s.href}>
              <i className={`bi ${s.icon}`} aria-hidden="true" /> {s.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
