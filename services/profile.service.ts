import type { Profile } from "@prisma/client";
import { profileRepository } from "@/repositories/profile.repository";
import { userRepository } from "@/repositories/user.repository";
import type { ProfileInput } from "@/lib/validations/profile";

/** Profile completion is calculated from real data – never hardcoded. */
export function computeProfileCompletion(profile: Profile | null, name: string | null | undefined, skillCount: number) {
  const checks: [string, boolean][] = [
    ["Add your name", Boolean(name)],
    ["Write a headline", Boolean(profile?.headline)],
    ["Write a short summary", (profile?.summary?.length ?? 0) >= 50],
    ["Add your location", Boolean(profile?.location)],
    ["Add target roles", (profile?.targetRoles.length ?? 0) > 0],
    ["Choose a work arrangement", Boolean(profile?.preferredWorkArrangement)],
    ["Add preferred locations", (profile?.preferredLocations.length ?? 0) > 0],
    ["Set a salary expectation", Boolean(profile?.salaryExpectationMin || profile?.salaryExpectationMax)],
    ["Add a portfolio, GitHub or LinkedIn link", Boolean(profile?.portfolioUrl || profile?.githubUrl || profile?.linkedinUrl)],
    ["List at least 5 skills", skillCount >= 5],
  ];
  const done = checks.filter(([, ok]) => ok).length;
  return { percent: Math.round((done / checks.length) * 100), missing: checks.filter(([, ok]) => !ok).map(([label]) => label) };
}

export const profileService = {
  async get(userId: string) {
    const [user, profile, skills] = await Promise.all([
      userRepository.findById(userId),
      profileRepository.findByUser(userId),
      profileRepository.listSkills(userId),
    ]);
    const completion = computeProfileCompletion(profile, user?.name, skills.length);
    return { user, profile, skills, completion };
  },

  async update(userId: string, input: ProfileInput) {
    const { name, skills, salaryMin, salaryMax, preferredWorkArrangement, ...rest } = input;
    await profileRepository.saveAll(
      userId,
      name,
      {
        headline: rest.headline || null,
        summary: rest.summary || null,
        location: rest.location || null,
        targetRoles: rest.targetRoles,
        preferredLocations: rest.preferredLocations,
        preferredWorkArrangement: preferredWorkArrangement || null,
        salaryExpectationMin: salaryMin ?? null,
        salaryExpectationMax: salaryMax ?? null,
        portfolioUrl: rest.portfolioUrl || null,
        githubUrl: rest.githubUrl || null,
        linkedinUrl: rest.linkedinUrl || null,
      },
      skills,
    );
  },

  updateSettings(userId: string, settings: { notifyApplicationUpdates: boolean; notifyJobAlerts: boolean; notifyProductNews: boolean; profileVisible: boolean }) {
    return profileRepository.updateSettings(userId, settings);
  },
};
