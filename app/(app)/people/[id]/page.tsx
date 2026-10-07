import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { RelationshipActions } from "@/components/network/RelationshipActions";
import { Avatar } from "@/components/ui/Avatar";
import { SkillBadge } from "@/components/ui/SkillBadge";
import { safeHttpUrl } from "@/lib/safe-url";
import { requireUserId } from "@/lib/session";
import { userIdSchema } from "@/lib/validations/network";
import { PostCard } from "@/components/social/PostCard";
import { networkingService } from "@/services/networking.service";
import { presenceLabel } from "@/lib/presence";
import { feedService } from "@/services/social/feed.service";
import { presenceService } from "@/services/presence.service";

export const metadata: Metadata = { title: "Profile" };

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const viewerId = await requireUserId();
  const parsed = userIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  if (parsed.data === viewerId) redirect("/profile");

  const view = await networkingService.getProfileView(viewerId, parsed.data);
  if (!view) notFound();

  if (view.kind === "blocked" || view.kind === "restricted") {
    return (
      <div className="profile-restricted">
        <Avatar name={view.name} src={view.kind === "restricted" ? view.avatarUrl : null} size={80} />
        <h1 className="h3 mt-3 mb-1">{view.name}</h1>
        <p className="text-muted">
          {view.kind === "blocked" ? "You blocked this person." : view.visibility === "CONNECTIONS_ONLY" ? "This profile is only visible to their connections." : "This profile is private."}
        </p>
        <RelationshipActions targetUserId={view.id} relationship={view.relationship} showFollow={false} />
      </div>
    );
  }

  // Posts: the same server-side visibility rules as the feed (public, plus connections-only when connected).
  const posts = await feedService
    .authorPosts(viewerId, view.id, view.relationship.state === "CONNECTED", null, 5)
    .then((p) => p.items)
    .catch((e) => { console.error("Profile posts failed", e); return null; });

  // Online status: only on a profile you may fully see, only if BOTH people share status (privacy switch), coarse wording.
  const presence = await presenceService.forViewer(viewerId, [view.id]).then((m) => m.get(view.id)).catch(() => undefined);
  const presenceText = presence ? presenceLabel(presence, "coarse") : null;

  const links = [
    { label: "Portfolio", icon: "bi-globe2", href: safeHttpUrl(view.links.portfolio) },
    { label: "GitHub", icon: "bi-github", href: safeHttpUrl(view.links.github) },
    { label: "LinkedIn", icon: "bi-linkedin", href: safeHttpUrl(view.links.linkedin) },
  ].filter((l) => l.href);

  return (
    <article className="profile-view">
      <div className="profile-cover" style={view.coverUrl ? { backgroundImage: `url(${view.coverUrl})` } : undefined} aria-hidden="true" />
      <div className="profile-head">
        <div className="profile-avatar"><Avatar name={view.name} src={view.avatarUrl} size={112} /></div>
        <div className="flex-grow-1 profile-head-text">
          <h1 className="h3 mb-0 text-break">{view.name}</h1>
          {presenceText && <p className="profile-presence mb-1"><span className={`presence-dot ${presence?.online ? "online" : "away"}`} aria-hidden="true" />{presenceText}</p>}
          {view.headline && <p className="mb-1 text-break">{view.headline}</p>}
          <p className="text-muted small mb-2">
            {view.location && <><i className="bi bi-geo-alt me-1" aria-hidden="true" />{view.location} · </>}
            {view.connections} connection{view.connections === 1 ? "" : "s"} · {view.followers} follower{view.followers === 1 ? "" : "s"}
          </p>
          <RelationshipActions targetUserId={view.id} relationship={view.relationship} showBlock showMessage />
        </div>
      </div>

      {view.summary && <section className="profile-section"><h2 className="section-title">About</h2><p className="mb-0" style={{ whiteSpace: "pre-line" }}>{view.summary}</p></section>}
      {view.targetRoles.length > 0 && <section className="profile-section"><h2 className="section-title">Looking for</h2><p className="mb-0">{view.targetRoles.join(" · ")}</p></section>}
      {view.skills.length > 0 && <section className="profile-section"><h2 className="section-title">Skills</h2><div className="d-flex flex-wrap gap-2">{view.skills.map((s) => <SkillBadge key={s} name={s} />)}</div></section>}
      {links.length > 0 && (
        <section className="profile-section">
          <h2 className="section-title">Links</h2>
          <ul className="list-inline mb-0">
            {links.map((l) => <li key={l.label} className="list-inline-item me-3"><a href={l.href!} target="_blank" rel="noopener noreferrer nofollow"><i className={`bi ${l.icon} me-1`} aria-hidden="true" />{l.label}</a></li>)}
          </ul>
        </section>
      )}
      <section className="profile-section" aria-labelledby="profile-posts">
        <h2 id="profile-posts" className="section-title">Posts</h2>
        {posts === null ? <p className="text-muted mb-0">We couldn't load posts right now.</p>
          : posts.length === 0 ? <p className="text-muted mb-0">{view.name} hasn't shared any posts yet.</p>
          : <div className="d-grid gap-3">{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>}
      </section>
    </article>
  );
}
