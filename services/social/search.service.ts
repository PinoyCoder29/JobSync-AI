import { jobRepository } from "@/repositories/job.repository";
import { blockRepository, discoveryRepository } from "@/repositories/networking.repository";
import { postRepository } from "@/repositories/post.repository";
import { canAppearInDiscovery, effectiveVisibility } from "@/lib/permissions/profile";
import { jobService } from "@/services/job.service";
import { toCard } from "@/services/networking.service";
import { toJobSummary } from "./mappers";
import { hydratePosts } from "./post.service";

export const SEARCH_TYPES = ["all", "people", "jobs", "companies", "posts", "skills"] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

/**
 * Unified search. Every section applies the same rules as the rest of the product: blocked people never appear,
 * only discoverable (public) profiles are listed, and only public posts are searchable.
 */
export const searchService = {
  async run(userId: string | null, rawQuery: string, type: SearchType = "all") {
    const q = rawQuery.trim().slice(0, 80);
    if (q.length < 2) return { query: q, people: [], jobs: [], companies: [], posts: [], skills: [] };

    const want = (t: SearchType) => type === "all" || type === t;
    const limit = type === "all" ? 4 : 12;
    const hidden = userId ? [...(await blockRepository.hiddenUserIds(userId))] : [];
    const exclude = userId ? [userId, ...hidden] : hidden;

    const [people, jobs, companies, posts, skills] = await Promise.all([
      want("people")
        ? discoveryRepository.searchPeople(q, exclude, limit).then((rows) => rows.filter((p) => canAppearInDiscovery(effectiveVisibility(p.profile))).map(toCard))
        : [],
      want("jobs") ? jobService.searchPage({ keyword: q }, "relevance", userId, null, limit).then((p) => p.items.map(toJobSummary)) : [],
      want("companies") ? jobRepository.searchCompanies(q, limit) : [],
      want("posts")
        ? postRepository.searchPublic(q, hidden, limit).then(async (ids) => hydratePosts(await postRepository.findByIds(ids.map((i) => i.id), userId), userId).then((list) => {
            const order = new Map(ids.map((p, i) => [p.id, i]));
            return list.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
          }))
        : [],
      want("skills") ? jobRepository.skillNames(q, limit) : [],
    ]);
    return { query: q, people, jobs, companies, posts, skills };
  },
};
