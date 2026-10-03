import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/AppShell";
import { Landing } from "@/components/landing/Landing";
import { Featured } from "@/components/featured/Featured";
import { ProfileSummaryCard, ShortcutsCard } from "@/components/home/ProfileSummaryCard";
import { RecommendedJobsCard } from "@/components/home/RecommendedJobsCard";
import { FeedList } from "@/components/social/FeedList";
import { profileRepository } from "@/repositories/profile.repository";
import { mediaService } from "@/services/media/media.service";
import { feedService } from "@/services/social/feed.service";
import type { FeedPageDTO } from "@/services/social/types";

export const metadata: Metadata = {
  title: "JobSync AI – Your career feed",
  description: "Career posts, people, recommended jobs and AI career tools in one place.",
};

/**
 * "/" is the Home feed for signed-in users and the marketing page for visitors.
 * The feed is rendered on the server (first page) and continues client-side with cursor pagination.
 */
export default async function Home() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return <Landing />;

  const name = session.user?.name ?? session.user?.email ?? "You";
  // Each section is isolated: if one fails, the rest of the page still renders (and nothing technical is shown).
  const [profile, images, feed] = await Promise.all([
    profileRepository.findByUser(userId).catch(() => null),
    mediaService.getUserImageUrls(userId).catch(() => null),
    feedService.getFeed(userId).catch((error): null => {
      console.error("Home feed failed", error);
      return null;
    }),
  ]);

  return (
    <AppShell>
      <div className="home-grid">
        <aside className="home-left" aria-label="Your profile and shortcuts">
          <ProfileSummaryCard name={name} headline={profile?.headline ?? null} avatarUrl={images?.avatarUrl ?? null} coverUrl={images?.coverUrl ?? null} />
          <ShortcutsCard />
        </aside>

        <div className="home-center">
          {feed ? (
            <FeedList initial={feed as FeedPageDTO} viewer={{ name, avatarUrl: images?.avatarSmUrl ?? null }} />
          ) : (
            <div className="empty-state error" role="alert">
              <i className="bi bi-exclamation-circle" aria-hidden="true" />
              <h2 className="h5">We couldn&apos;t load your feed.</h2>
              <p className="text-muted">Please try again in a moment.</p>
              <Link href="/" className="btn btn-brand">Try again</Link>
            </div>
          )}
        </div>

        <aside className="home-right" aria-label="Recommendations">
          <RecommendedJobsCard userId={userId} />
          <Featured category="FEATURED_PERSON" userId={userId} limit={3} title="People you may know" />
          <Featured category="FEATURED_COMPANY" userId={userId} limit={3} />
          <Featured category="FEATURED_SKILL" userId={userId} limit={4} />
        </aside>
      </div>
    </AppShell>
  );
}
