import { AppError } from "@/lib/errors";
import { analysisRepository } from "@/repositories/analysis.repository";
import { jobRepository } from "@/repositories/job.repository";
import { profileRepository } from "@/repositories/profile.repository";
import { getAIProvider } from "./ai";
import { resumeService } from "./resume.service";

export type SectionScore = { label: string; score: number };

export const analysisService = {
  latestResumeAnalysis(userId: string) {
    return analysisRepository.latestResumeAnalysis(userId);
  },

  async runResumeAnalysis(userId: string) {
    const data = await resumeService.getSnapshot(userId);
    if (!data) throw new AppError("Build your resume first, then run the analysis.", "NOT_FOUND");
    const ai = getAIProvider();
    const r = await ai.analyzeResume(data.snapshot);
    return analysisRepository.createResumeAnalysis({
      userId, resumeId: data.resumeId, score: r.score, sections: r.sections,
      strengths: r.strengths, weaknesses: r.weaknesses, suggestions: r.suggestions,
      keywordsFound: r.keywordsFound, keywordsSuggested: r.keywordsSuggested,
      provider: ai.name, isDemo: ai.isDemo,
    });
  },

  /** Skill gap = what active jobs ask for minus what the user lists (profile + resume). */
  async skillAnalysis(userId: string) {
    const [userSkills, snapshot, jobs] = await Promise.all([
      profileRepository.listSkills(userId),
      resumeService.getSnapshot(userId),
      jobRepository.listActive(100),
    ]);
    const levels = new Map(userSkills.map((s) => [s.skill.name, s.level]));
    snapshot?.snapshot.skills.forEach((name) => { if (!levels.has(name)) levels.set(name, 3); });

    const counts = new Map<string, number>();
    jobs.forEach((j) => j.skills.forEach((s) => counts.set(s.skill.name, (counts.get(s.skill.name) ?? 0) + 1)));

    const result = await getAIProvider().analyzeSkills({
      userSkills: [...levels.entries()].map(([name, level]) => ({ name, level })),
      demand: [...counts.entries()].map(([name, jobCount]) => ({ name, jobCount })),
      totalJobs: jobs.length,
    });
    return { ...result, current: [...levels.entries()].map(([name, level]) => ({ name, level })).sort((a, b) => b.level - a.level), totalJobs: jobs.length, isDemo: getAIProvider().isDemo };
  },
};
