/**
 * Deterministic feed ranking. Pure functions only (no database, no AI), so the feed works when Gemini is down
 * and the algorithm can be swapped by replacing `rankFeed` or the weights below.
 *
 * Ranking happens inside each page of the chronological stream. Cursors always follow (createdAt, id), so
 * pagination stays stable even though the order inside a page is relevance-based.
 */
export const FEED_WEIGHTS = {
  relationship: { self: 40, connection: 30, following: 24, none: 4 },
  recencyMax: 40,
  recencyHalfLifeHours: 36,
  engagementMax: 18,
  careerRelevanceMax: 14,
  jobRelevanceMax: 10,
} as const;

export type RankInput = {
  id: string;
  createdAt: Date;
  relationship: "self" | "connection" | "following" | "none";
  reactions: number;
  comments: number;
  shares: number;
  /** skills shared between the viewer and the post's author / linked job */
  sharedSkills: number;
  postType: string;
  /** 0-100 recommendation score of the linked job for the viewer, when the post links a job */
  jobMatch: number | null;
};

export type RankBreakdown = { relationship: number; recency: number; engagement: number; careerRelevance: number; jobRelevance: number; total: number };

export function scorePost(input: RankInput, now = Date.now(), w = FEED_WEIGHTS): RankBreakdown {
  const relationship = w.relationship[input.relationship];
  const ageHours = Math.max(0, (now - input.createdAt.getTime()) / 3_600_000);
  const recency = w.recencyMax * Math.pow(0.5, ageHours / w.recencyHalfLifeHours);
  // log scale so a viral post can't bury everything else; comments and shares say more than a reaction
  const engagement = Math.min(w.engagementMax, Math.log2(1 + input.reactions + input.comments * 2 + input.shares * 3) * 3);
  const careerRelevance = Math.min(w.careerRelevanceMax, input.sharedSkills * 4 + (["ACHIEVEMENT", "PROJECT", "CAREER_UPDATE"].includes(input.postType) ? 2 : 0));
  const jobRelevance = input.jobMatch === null ? 0 : (input.jobMatch / 100) * w.jobRelevanceMax;
  const total = relationship + recency + engagement + careerRelevance + jobRelevance;
  return { relationship, recency, engagement, careerRelevance, jobRelevance, total };
}

/** Stable: equal scores keep their incoming (newest-first) order. */
export function rankFeed<T extends RankInput>(items: T[], now = Date.now()): T[] {
  return items
    .map((item, index) => ({ item, index, score: scorePost(item, now).total }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((r) => r.item);
}

/** Where recommended-job / insight cards are slotted into a ranked page (0-based positions among posts). */
export const FEED_SLOTS = { jobs: [2, 6, 11], insight: 4 } as const;

export type FeedEntry<P, J, I> = { kind: "post"; post: P } | { kind: "job"; job: J } | { kind: "insight"; insight: I };

/** Interleaves non-post cards without ever dropping a post. Cards that don't fit (short pages) are simply omitted. */
export function interleave<P, J, I>(posts: P[], jobs: J[], insight: I | null): FeedEntry<P, J, I>[] {
  const out: FeedEntry<P, J, I>[] = [];
  let jobIndex = 0;
  posts.forEach((post, i) => {
    out.push({ kind: "post", post });
    const position = i + 1;
    if ((FEED_SLOTS.jobs as readonly number[]).includes(position) && jobIndex < jobs.length) out.push({ kind: "job", job: jobs[jobIndex++] });
    if (position === FEED_SLOTS.insight && insight) out.push({ kind: "insight", insight });
  });
  // a very short first page still shows one recommendation so the feed never looks like only posts
  if (posts.length > 0 && posts.length < 3 && jobIndex < jobs.length) out.push({ kind: "job", job: jobs[jobIndex++] });
  if (posts.length === 0 && jobs.length > 0) jobs.slice(0, 2).forEach((job) => out.push({ kind: "job", job }));
  return out;
}
