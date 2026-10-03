import Link from "next/link";
import { auth } from "@/auth";
import { logoutAction } from "@/app/actions/auth.actions";
import { BottomNav } from "./BottomNav";
import { MobileNav } from "./MobileNav";
import { TopNav } from "./TopNav";
import { notificationService } from "@/services/social/notification.service";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Avatar } from "@/components/ui/Avatar";
import { mediaService } from "@/services/media/media.service";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user;
  const [images, unread] = user?.id
    ? await Promise.all([mediaService.getUserImageUrls(user.id), notificationService.unreadCount(user.id).catch(() => 0)])
    : [null, 0];

  return (
    <div className="app-shell">
      {/* Skip to content */}
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      {/* Topbar */}
      <header className="topbar">
        {/* Mobile Menu */}
        <div className="d-lg-none">
          <MobileNav />
        </div>

        {/* Desktop Brand */}
        <Link
          href="/"
          className="brand d-none d-lg-inline-flex"
        >
          JobSync <span className="brand-ai">AI</span>
        </Link>

        {/* Search */}
        <form
          action="/search"
          method="get"
          role="search"
          className="topbar-search d-none d-md-flex"
        >
          <label htmlFor="global-search" className="visually-hidden">
            Search JobSync AI
          </label>

          <input
            id="global-search"
            name="q"
            type="search"
            className="form-control"
            placeholder="Search people, jobs, companies, posts"
          />
        </form>

        {/* Primary navigation (desktop) */}
        {user && <div className="d-none d-lg-block"><TopNav unread={unread} /></div>}

        {/* Right Side */}
        <div className="d-flex align-items-center gap-2 ms-auto">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Account */}
          {user ? (
            <details className="user-menu">
              <summary>
                {images?.avatarSmUrl ? (
                  <Avatar name={user.name ?? user.email ?? "U"} src={images.avatarSmUrl} size={32} />
                ) : (
                  <span className="avatar" aria-hidden="true">
                    {(user.name ?? user.email ?? "U").charAt(0).toUpperCase()}
                  </span>
                )}

                <span className="d-none d-sm-inline">
                  {user.name ?? user.email}
                </span>
              </summary>

              <div className="user-menu-panel">
                <div className="small text-muted px-3 pt-2">{user.email}</div>

                <Link href="/profile" className="dropdown-item">
                  Profile
                </Link>

                <Link href="/settings" className="dropdown-item">
                  Settings
                </Link>

                <form action={logoutAction}>
                  <button type="submit" className="dropdown-item">
                    Log out
                  </button>
                </form>
              </div>
            </details>
          ) : (
            <>
              <Link href="/login" className="btn btn-outline-brand btn-sm">
                Log in
              </Link>

              <Link href="/register" className="btn btn-brand btn-sm">
                Sign up
              </Link>
            </>
          )}
        </div>
      </header>

      {/* App Body */}
      <div className="app-body app-body--topnav">
        {/* Main Content */}
        <main id="main" className="main-content">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      {user && <BottomNav />}
    </div>
  );
}
