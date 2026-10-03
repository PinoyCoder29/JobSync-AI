import type { Metadata } from "next";
import Link from "next/link";
import { Featured } from "@/components/featured/Featured";
import { PostCard } from "@/components/social/PostCard";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { JobResultCard } from "@/components/jobs/JobResultCard";
import { getCurrentUserId } from "@/lib/session";
import { SEARCH_TYPES, searchService, type SearchType } from "@/services/social/search.service";

export const metadata: Metadata = { title: "Search" };
type Props = { searchParams: Promise<{ q?: string; type?: string }> };
const LABEL: Record<SearchType, string> = { all: "All", people: "People", jobs: "Jobs", companies: "Companies", posts: "Posts", skills: "Skills" };

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const type = (SEARCH_TYPES as readonly string[]).includes(sp.type ?? "") ? (sp.type as SearchType) : "all";
  const userId = await getCurrentUserId();
  const results = q.length >= 2 ? await searchService.run(userId, q, type).catch((e) => { console.error("Search failed", e); return null; }) : null;
  const total = results ? results.people.length + results.jobs.length + results.companies.length + results.posts.length + results.skills.length : 0;
  const tabHref = (t: SearchType) => `/search?q=${encodeURIComponent(q)}${t === "all" ? "" : `&type=${t}`}`;

  return (
    <div className="narrow-page wide">
      <h1 className="page-title">Search JobSync AI</h1>
      <form action="/search" method="get" role="search" className="d-flex gap-2 mb-3">
        <label htmlFor="search-q" className="visually-hidden">Search</label>
        <input id="search-q" name="q" type="search" defaultValue={q} className="form-control" placeholder="React Developer" maxLength={80} />
        {type !== "all" && <input type="hidden" name="type" value={type} />}
        <button className="btn btn-brand" type="submit">Search</button>
      </form>
      <nav className="network-tabs mb-3" aria-label="Search categories">
        {SEARCH_TYPES.map((t) => <Link key={t} href={tabHref(t)} className={`network-tab ${t === type ? "active" : ""}`} aria-current={t === type ? "page" : undefined}>{LABEL[t]}</Link>)}
      </nav>

      {q.length < 2 ? (
        <>
          <p className="text-muted">Type at least two characters to search people, jobs, companies, posts and skills.</p>
          <div className="row g-3"><div className="col-md-6"><Featured category="FEATURED_SKILL" userId={userId} limit={6} /></div><div className="col-md-6"><Featured category="FEATURED_COMPANY" userId={userId} limit={5} /></div></div>
        </>
      ) : !results ? (
        <div className="empty-state error" role="alert"><p className="mb-0">We couldn&apos;t complete your search. Please try again.</p></div>
      ) : total === 0 ? (
        <EmptyState icon="bi-search" title={`No results for “${q}”.`} text="Check the spelling or try a broader search." />
      ) : (
        <div className="d-grid gap-4">
          {results.people.length > 0 && (
            <section><h2 className="section-title">People</h2><div className="row g-2">{results.people.map((p) => (
              <div className="col-12 col-md-6" key={p.id}><Link href={`/people/${p.id}`} className="featured-row side-card mb-0"><Avatar name={p.name} src={p.avatarUrl} size={44} /><span className="min-w-0"><strong className="d-block text-truncate">{p.name}</strong>{p.headline && <span className="small text-muted d-block text-truncate">{p.headline}</span>}</span></Link></div>
            ))}</div></section>
          )}
          {results.jobs.length > 0 && <section><h2 className="section-title">Jobs</h2><div className="row g-2">{results.jobs.map((j) => <div className="col-12 col-md-6" key={j.id}><JobResultCard job={j} /></div>)}</div>{type === "all" && <Link href={`/jobs?keyword=${encodeURIComponent(q)}`} className="small">See all jobs for “{q}” →</Link>}</section>}
          {results.companies.length > 0 && <section><h2 className="section-title">Companies</h2><ul className="featured-list">{results.companies.map((c) => <li key={c.name}><Link href={`/jobs?keyword=${encodeURIComponent(c.name)}`} className="featured-row"><span className="company-logo" aria-hidden="true">{c.name.charAt(0).toUpperCase()}</span><span><strong>{c.name}</strong> <span className="small text-muted">· {c.jobs} open {c.jobs === 1 ? "job" : "jobs"}</span></span></Link></li>)}</ul></section>}
          {results.skills.length > 0 && <section><h2 className="section-title">Skills</h2><div className="d-flex flex-wrap gap-2">{results.skills.map((s) => <Link key={s} className="chip-btn" href={`/jobs?skill=${encodeURIComponent(s)}`}>{s}</Link>)}</div></section>}
          {results.posts.length > 0 && <section><h2 className="section-title">Posts</h2><div className="d-grid gap-3">{results.posts.map((p) => <PostCard key={p.id} post={p} />)}</div></section>}
        </div>
      )}
    </div>
  );
}
