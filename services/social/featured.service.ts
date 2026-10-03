import { cache } from "react";
import type { FeaturedCategory } from "@prisma/client";
import { canAppearInDiscovery, effectiveVisibility } from "@/lib/permissions/profile";
import { blockRepository, discoveryRepository } from "@/repositories/networking.repository";
import { featuredRepository } from "@/repositories/featured.repository";
import { jobRepository } from "@/repositories/job.repository";
import { postRepository } from "@/repositories/post.repository";
import { profileRepository } from "@/repositories/profile.repository";
import { jobRecommendationService } from "@/services/jobs/job-recommendation.service";
import { networkingService, toCard, type PersonCardData } from "@/services/networking.service";
import type { JobListItem } from "@/types";
import { hydratePosts } from "./post.service";
import { toJobSummary } from "./mappers";
import type { InsightDTO, JobSummaryDTO, PostDTO } from "./types";

export type FeaturedBlock =
  | { category: "FEATURED_JOB"; title: string; items: JobSummaryDTO[] }
  | { category: "FEATURED_COMPANY"; title: string; items: { name: string; jobs: number }[] }
  | { category: "FEATURED_PERSON"; title: string; items: (PersonCardData & { reasons: string[] })[] }
  | { category: "FEATURED_SKILL"; title: string; items: { name: string; jobs: number; have: boolean }[] }
  | { category: "FEATURED_POST"; title: string; items: PostDTO[] }
  | { category: "FEATURED_LEARNING"; title: string; items: never[] }
  | { category: "FEATURED_EVENT"; title: string; items: never[] };

export const FEATURED_TITLES: Record<FeaturedCategory, string> = {
  FEATURED_JOB: "Featured jobs",
  FEATURED_COMPANY: "Companies to explore",
  FEATURED_PERSON: "Professionals you may know",
  FEATURED_POST: "Popular this week",
  FEATURED_SKILL: "Skills in demand",
  FEATURED_LEARNING: "Recommended learning",
  FEATURED_EVENT: "Upcoming events",
};

const toListItem = (job: Awaited<ReturnType<typeof jobRepository.listByIds>>[number], saved = false): JobListItem => ({ ...job, match: null, saved });

/**
 * One reusable entry point for every Featured block (Home, Find Jobs, Network, Profile, Search).
 * Order of precedence: active admin/editorial picks (FeaturedItem rows) first, then an algorithmic fallback.
 * Learning and events have no content source yet, so they return nothing instead of inventing content.
 */
export const featuredService = {
  async get(category: FeaturedCategory, userId: string | null, limit = 4): Promise<FeaturedBlock> {
    const title = FEATURED_TITLES[category];
    const picks = await featuredRepository.active(category, limit);
    const pickedIds = picks.map((p) => p.targetId);

    switch (category) {
      case "FEATURED_JOB": {
        let jobs: JobListItem[];
        if (pickedIds.length) {
          const rows = await jobRepository.listByIds(pickedIds);
          const order = new Map(pickedIds.map((id, i) => [id, i]));
          rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
          jobs = userId ? await jobRecommendationService.decorate(userId, rows) : rows.map((r) => toListItem(r));
        } else {
          jobs = userId ? await jobRecommendationService.recommend(userId, limit) : (await jobRepository.listActive(limit)).map((r) => toListItem(r));
        }
        return { category, title, items: jobs.map(toJobSummary) };
      }
      case "FEATURED_COMPANY": {
        const names = pickedIds.length ? pickedIds : (await jobRepository.topCompanies(limit)).map((c) => c.name);
        const top = await jobRepository.topCompanies(50);
        const counts = new Map(top.map((c) => [c.name, c.jobs]));
        return { category, title, items: names.slice(0, limit).map((name) => ({ name, jobs: counts.get(name) ?? 0 })) };
      }
      case "FEATURED_PERSON": {
        if (!userId) return { category, title, items: [] };
        if (pickedIds.length) {
          const hidden = await blockRepository.hiddenUserIds(userId);
          const people = (await discoveryRepository.findCards(pickedIds)).filter((p) => p.id !== userId && !hidden.has(p.id) && canAppearInDiscovery(effectiveVisibility(p.profile)));
          return { category, title, items: people.map((p) => ({ ...toCard(p), reasons: ["Featured on JobSync AI"] })) };
        }
        return { category, title, items: await networkingService.suggestions(userId, limit) };
      }
      case "FEATURED_SKILL": {
        const mine = userId ? new Set((await profileRepository.listSkills(userId)).map((s) => s.skill.name.toLowerCase())) : new Set<string>();
        const top = await jobRepository.topSkills(pickedIds.length ? 50 : limit);
        const rows = pickedIds.length ? pickedIds.map((name) => ({ name, jobs: top.find((t) => t.name.toLowerCase() === name.toLowerCase())?.jobs ?? 0 })) : top;
        return { category, title, items: rows.slice(0, limit).map((r) => ({ ...r, have: mine.has(r.name.toLowerCase()) })) };
      }
      case "FEATURED_POST": {
        const hidden = userId ? [...(await blockRepository.hiddenUserIds(userId))] : [];
        const ids = pickedIds.length ? pickedIds : (await postRepository.topPublicPosts(7, hidden, limit)).map((p) => p.id);
        const records = (await postRepository.findByIds(ids, userId)).filter((r) => r.visibility === "PUBLIC" && !hidden.includes(r.authorId));
        return { category, title, items: await hydratePosts(records, userId) };
      }
      case "FEATURED_LEARNING":
      case "FEATURED_EVENT":
        return { category, title, items: [] };
    }
  },

  /**
   * A short insight built ONLY from real counts (open jobs per skill) and the user's own listed skills.
   * No claims about salaries, trends or hiring outcomes are made.
   */
  async careerInsight(userId: string): Promise<InsightDTO | null> {
    const [top, mine] = await Promise.all([jobRepository.topSkills(8), profileRepository.listSkills(userId)]);
    if (top.length === 0) return null;
    const have = new Set(mine.map((s) => s.skill.name.toLowerCase()));
    const gap = top.find((s) => !have.has(s.name.toLowerCase()));
    if (gap) {
      return {
        title: `${gap.name} appears in ${gap.jobs} open ${gap.jobs === 1 ? "job" : "jobs"}`,
        text: `It's one of the most common skills in current listings and isn't on your profile yet. If you work with it, add it so we can match you better.`,
        href: "/profile",
        cta: "Update your skills",
      };
    }
    const first = top[0];
    return {
      title: `Your skills line up with what's in demand`,
      text: `${first.name} leads current listings with ${first.jobs} open ${first.jobs === 1 ? "job" : "jobs"}, and it's already on your profile.`,
      href: `/jobs?skill=${encodeURIComponent(first.name)}`,
      cta: `Browse ${first.name} jobs`,
    };
  },
};

/** Per-request memo so a page that renders several blocks doesn't repeat the same queries. */
export const getFeaturedCached = cache((category: FeaturedCategory, userId: string | null, limit: number) => featuredService.get(category, userId, limit));
