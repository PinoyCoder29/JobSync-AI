import Link from "next/link";
import { auth } from "@/auth";
import { logoutAction } from "@/app/actions/auth.actions";
import { MobileNav } from "./MobileNav";
import { NavLinks } from "./NavLinks";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="topbar">
        <div className="d-flex align-items-center gap-3">
          <MobileNav />
          <Link href={user ? "/dashboard" : "/"} className="brand">JobSync <span className="brand-ai">AI</span></Link>
        </div>
        <form action="/jobs" method="get" role="search" className="topbar-search d-none d-md-flex">
          <label htmlFor="global-search" className="visually-hidden">Search jobs</label>
          <input id="global-search" name="q" type="search" className="form-control" placeholder="Search jobs, companies or skills" />
        </form>
        <div className="d-flex align-items-center gap-2">
          <ThemeToggle />
          {user ? (
            <details className="user-menu">
              <summary>
                <span className="avatar" aria-hidden="true">{(user.name ?? user.email ?? "U").charAt(0).toUpperCase()}</span>
                <span className="d-none d-sm-inline">{user.name ?? user.email}</span>
              </summary>
              <div className="user-menu-panel">
                <div className="small text-muted px-3 pt-2">{user.email}</div>
                <Link href="/profile" className="dropdown-item">Profile</Link>
                <Link href="/settings" className="dropdown-item">Settings</Link>
                <form action={logoutAction}>
                  <button type="submit" className="dropdown-item">Log out</button>
                </form>
              </div>
            </details>
          ) : (
            <>
              <Link href="/login" className="btn btn-outline-brand btn-sm">Log in</Link>
              <Link href="/register" className="btn btn-brand btn-sm">Sign up</Link>
            </>
          )}
        </div>
      </header>
      <div className="app-body">
        <aside className="sidebar d-none d-lg-block"><NavLinks /></aside>
        <main id="main" className="main-content">{children}</main>
      </div>
    </div>
  );
}
