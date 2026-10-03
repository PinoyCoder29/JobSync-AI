import { rankFeed, interleave, type RankInput } from "@/lib/recommendations/feed-ranking";
import { scoreJob, type JobCandidate } from "@/lib/recommendations/jobs";
import { blockRepository, discoveryRepository } from "@/repositories/networking.repository";
import { decodePostCursor, encodePostCursor, postRepository } from "@/repositories/post.repository";
import { jobRecommendationService } from "@/services/jobs/job-recommendation.service";
import { featuredService } from "./featured.service";
import { toJobSummary } from "./mappers";
import { hydratePosts } from "./post.service";
import type { FeedItemDTO, FeedPageDTO } from "./types";

export const FEED_PAGE_SIZE = 12;

export const feedService = {
  /**
   * Home feed. Works with no AI at all.
   *   1. Pull a page of the chronological stream the viewer is allowed to see (visibility + blocks enforced in SQL).
   *   2. Rank that page deterministically (relationship, recency, engagement, shared skills, job relevance).
   *   3. On the first page, slot in recommended-job and career-insight cards.
   * The cursor always follows (createdAt, id), so "Load more" never repeats or skips posts.
   */
  async getFeed(userId: string, opts: { cursor?: string | null; limit?: number } = {}): Promise<FeedPageDTO> {
    const limit = Math.min(opts.limit ?? FEED_PAGE_SIZE, 20);
    const cursor = decodePostCursor(opts.cursor);
    const isFirstPage = !opts.cursor;

    const hidden = [...(await blockRepository.hiddenUserIds(userId))];
    const rows = await postRepository.feedPage({ viewerId: userId, hiddenIds: hidden, cursor, take: limit });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore && page.length ? encodePostCursor(page[page.length - 1].createdAt, page[page.length - 1].id) : null;

    const [dtos, ctx, viewer, skillsByUser] = await Promise.all([
      hydratePosts(page, userId),
      jobRecommendationService.loadContext(userId),
      discoveryRepository.viewerSignals(userId),
      postRepository.skillsOf([...new Set(page.map((p) => p.authorId))]),
    ]);

    const mySkills = new Set((viewer?.skills ?? []).map((s) => s.skill.name.toLowerCase()));
    const ranked = rankFeed(
      dtos.map((dto, i) => {
        const record = page[i];
        const authorSkills = skillsByUser.get(record.authorId) ?? [];
        const jobSkills = record.job?.skills.map((s) => s.skill.name) ?? [];
        const sharedSkills = new Set([...authorSkills, ...jobSkills].map((s) => s.toLowerCase()).filter((s) => mySkills.has(s))).size;
        const jobMatch = record.job
          ? scoreJob(
              {
                title: record.job.title,
                location: record.job.location,
                workArrangement: record.job.workArrangement,
                employmentType: record.job.employmentType,
                experienceLevel: record.job.experienceLevel,
                salaryMin: record.job.salaryMin,
                salaryMax: record.job.salaryMax,
                skills: record.job.skills.map((s) => ({ name: s.skill.name, required: s.required })),
              },
              ctx.candidate as JobCandidate,
            ).score
          : null;
        const input: RankInput & { dto: typeof dto } = {
          id: dto.id,
          createdAt: record.createdAt,
          relationship: dto.author.relationship,
          reactions: dto.counts.reactions,
          comments: dto.counts.comments,
          shares: dto.counts.shares,
          sharedSkills,
          postType: dto.postType,
          jobMatch,
          dto,
        };
        return input;
      }),
    ).map((r) => r.dto);

    let jobCards: ReturnType<typeof toJobSummary>[] = [];
    let insight = null;
    if (isFirstPage) {
      const [jobs, insightResult] = await Promise.all([
        jobRecommendationService.recommend(userId, 3),
        featuredService.careerInsight(userId).catch(() => null),
      ]);
      jobCards = jobs.map(toJobSummary);
      insight = insightResult;
    }

    const entries = interleave(ranked, jobCards, insight);
    const items: FeedItemDTO[] = entries.map((e) =>
      e.kind === "post" ? { kind: "post", key: `p-${e.post.id}`, post: e.post } : e.kind === "job" ? { kind: "job", key: `j-${e.job.id}`, job: e.job } : { kind: "insight", key: "insight", insight: e.insight },
    );
    return { items, nextCursor, hasMore };
  },

  /** Posts on one person's profile, with the viewer's visibility applied. */
  async authorPosts(viewerId: string | null, authorId: string, connected: boolean, cursor?: string | null, take = 10) {
    const rows = await postRepository.authorPage({ viewerId, authorId, connected, cursor: decodePostCursor(cursor), take });
    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    return {
      items: await hydratePosts(page, viewerId),
      hasMore,
      nextCursor: hasMore && page.length ? encodePostCursor(page[page.length - 1].createdAt, page[page.length - 1].id) : null,
    };
  },
};
