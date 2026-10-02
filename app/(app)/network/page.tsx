import type { Metadata } from "next";
import Link from "next/link";
import {
  cancelRequestAction,
  followAction,
  removeConnectionAction,
  respondToRequestAction,
  sendConnectionRequestAction,
  unblockUserAction,
  unfollowAction,
} from "@/app/actions/network.actions";
import { ActionButton } from "@/components/network/ActionButton";
import { PersonCard } from "@/components/network/PersonCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { cursorSchema, networkTabSchema } from "@/lib/validations/network";
import { requireUserId } from "@/lib/session";
import { networkingService } from "@/services/networking.service";

export const metadata: Metadata = { title: "My Network" };

type SearchParams = Promise<{ tab?: string; cursor?: string }>;

export default async function NetworkPage({ searchParams }: { searchParams: SearchParams }) {
  const userId = await requireUserId();
  const params = await searchParams;
  const tab = networkTabSchema.parse(params.tab);
  const cursor = cursorSchema.parse(params.cursor);
  const summary = await networkingService.summary(userId);

  const tabs = [
    { id: "suggestions", label: "People you may know" },
    { id: "requests", label: "Requests", count: summary.pendingRequests },
    { id: "connections", label: "Connections", count: summary.connections },
    { id: "following", label: "Following", count: summary.following },
    { id: "blocked", label: "Blocked" },
  ] as const;

  return (
    <div>
      <h1 className="page-title">My Network</h1>
      <p className="text-muted mb-3">Grow your professional circle. Connections are mutual; following is one-way.</p>

      <nav aria-label="Network sections" className="network-tabs">
        {tabs.map((t) => (
          <Link key={t.id} href={`/network?tab=${t.id}`} className={`network-tab ${tab === t.id ? "active" : ""}`} aria-current={tab === t.id ? "page" : undefined}>
            {t.label}
            {"count" in t && t.count > 0 && <span className="network-count">{t.count}</span>}
          </Link>
        ))}
      </nav>

      {tab === "suggestions" && <Suggestions userId={userId} />}
      {tab === "requests" && <Requests userId={userId} />}
      {tab === "connections" && <Connections userId={userId} cursor={cursor} />}
      {tab === "following" && <Following userId={userId} cursor={cursor} />}
      {tab === "blocked" && <Blocked userId={userId} />}
    </div>
  );
}

async function Suggestions({ userId }: { userId: string }) {
  const people = await networkingService.suggestions(userId);
  if (people.length === 0) {
    return <EmptyState icon="bi-people" title="No suggestions yet" text="Add skills and target roles to your profile and we'll suggest people with similar interests." href="/profile" actionLabel="Update profile" />;
  }
  return (
    <section aria-label="People you may know" className="person-grid">
      {people.map((p) => (
        <PersonCard key={p.id} person={p} reasons={p.reasons}>
          <ActionButton action={sendConnectionRequestAction} fields={{ targetUserId: p.id }} label="Connect" icon="bi-person-plus" pendingText="Sending…" className="btn btn-brand btn-sm" />
          <ActionButton action={followAction} fields={{ targetUserId: p.id }} label="Follow" icon="bi-bell" pendingText="Following…" />
        </PersonCard>
      ))}
    </section>
  );
}

async function Requests({ userId }: { userId: string }) {
  const { incoming, outgoing } = await networkingService.listRequests(userId);
  if (incoming.length === 0 && outgoing.length === 0) {
    return <EmptyState icon="bi-envelope-open" title="No pending requests" text="When someone wants to connect, or you send a request, it shows up here." href="/network" actionLabel="Find people" />;
  }
  return (
    <>
      <h2 className="section-title">Received ({incoming.length})</h2>
      {incoming.length === 0 ? <p className="text-muted">Nothing waiting for you.</p> : (
        <div className="person-grid mb-4">
          {incoming.map((r) => (
            <PersonCard key={r.connectionId} person={r.person} note={r.note}>
              <ActionButton action={respondToRequestAction} fields={{ connectionId: r.connectionId, decision: "accept" }} label="Accept" icon="bi-check2" pendingText="Accepting…" className="btn btn-brand btn-sm" />
              <ActionButton action={respondToRequestAction} fields={{ connectionId: r.connectionId, decision: "reject" }} label="Decline" pendingText="Declining…" />
            </PersonCard>
          ))}
        </div>
      )}
      <h2 className="section-title">Sent ({outgoing.length})</h2>
      {outgoing.length === 0 ? <p className="text-muted">You haven&apos;t sent any requests.</p> : (
        <div className="person-grid">
          {outgoing.map((r) => (
            <PersonCard key={r.connectionId} person={r.person}>
              <ActionButton action={cancelRequestAction} fields={{ connectionId: r.connectionId }} label="Withdraw" pendingText="Withdrawing…" />
            </PersonCard>
          ))}
        </div>
      )}
    </>
  );
}

function LoadMore({ tab, cursor }: { tab: string; cursor: string | null }) {
  if (!cursor) return null;
  return <div className="text-center mt-4"><Link className="btn btn-outline-brand" href={`/network?tab=${tab}&cursor=${cursor}`}>Show more</Link></div>;
}

async function Connections({ userId, cursor }: { userId: string; cursor?: string }) {
  const page = await networkingService.listConnections(userId, cursor);
  if (page.items.length === 0) {
    return <EmptyState icon="bi-person-lines-fill" title="No connections yet" text="Send a few requests to people you know or share skills with." href="/network?tab=suggestions" actionLabel="See suggestions" />;
  }
  return (
    <>
      <section aria-label="Connections" className="person-grid">
        {page.items.map(({ connectionId, person }) => (
          <PersonCard key={connectionId} person={person}>
            <ActionButton action={removeConnectionAction} fields={{ targetUserId: person.id }} label="Remove" pendingText="Removing…" confirm={`Remove ${person.name} from your connections?`} />
          </PersonCard>
        ))}
      </section>
      <LoadMore tab="connections" cursor={page.hasMore ? page.nextCursor : null} />
    </>
  );
}

async function Following({ userId, cursor }: { userId: string; cursor?: string }) {
  const page = await networkingService.listFollowing(userId, cursor);
  if (page.items.length === 0) {
    return <EmptyState icon="bi-bell" title="You aren't following anyone" text="Follow people to keep up with what they share." href="/network?tab=suggestions" actionLabel="Find people" />;
  }
  return (
    <>
      <section aria-label="Following" className="person-grid">
        {page.items.map(({ person }) => (
          <PersonCard key={person.id} person={person}>
            <ActionButton action={unfollowAction} fields={{ targetUserId: person.id }} label="Unfollow" pendingText="Updating…" />
          </PersonCard>
        ))}
      </section>
      <LoadMore tab="following" cursor={page.hasMore ? page.nextCursor : null} />
    </>
  );
}

async function Blocked({ userId }: { userId: string }) {
  const people = await networkingService.listBlocked(userId);
  if (people.length === 0) return <EmptyState icon="bi-slash-circle" title="No blocked people" text="People you block can't find you, contact you or connect with you." />;
  return (
    <section aria-label="Blocked people" className="person-grid">
      {people.map((p) => (
        <PersonCard key={p.id} person={p}>
          <ActionButton action={unblockUserAction} fields={{ targetUserId: p.id }} label="Unblock" pendingText="Unblocking…" />
        </PersonCard>
      ))}
    </section>
  );
}
