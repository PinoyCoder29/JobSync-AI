import type { Difficulty } from "@prisma/client";
import { QUESTION_BANK } from "./question-bank";
import type {
  AIProvider, ATSResult, InterviewFeedbackResult, InterviewQuestionDraft, ResumeAnalysisResult, ResumeSnapshot,
  SkillAnalysisInput, SkillAnalysisResult,
} from "./types";

const TECH_KEYWORDS = [
  "react", "next.js", "typescript", "javascript", "node.js", "postgresql", "sql", "rest api", "graphql", "docker",
  "aws", "ci/cd", "git", "testing", "jest", "html", "css", "bootstrap", "prisma", "agile", "accessibility",
];

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(n)));

export function resumeText(r: ResumeSnapshot): string {
  return [
    r.headline, r.summary, r.skills.join(" "),
    ...r.experiences.map((e) => `${e.role} ${e.company} ${e.description}`),
    ...r.projects.map((p) => `${p.name} ${p.description} ${p.technologies}`),
    ...r.education.map((e) => `${e.school} ${e.degree}`),
    ...r.certifications.map((c) => c.name),
  ].join(" ").toLowerCase();
}

/**
 * Deterministic development provider. Same resume in → same result out.
 * These are heuristics, NOT model output – the UI labels them "Demo analysis".
 */
export class MockAIProvider implements AIProvider {
  readonly name = "mock";
  readonly isDemo = true;

  async analyzeResume(resume: ResumeSnapshot): Promise<ResumeAnalysisResult> {
    const text = resumeText(resume);
    const found = TECH_KEYWORDS.filter((k) => text.includes(k));
    const missing = TECH_KEYWORDS.filter((k) => !text.includes(k));
    const bulletChars = resume.experiences.reduce((n, e) => n + e.description.length, 0);
    const hasMetrics = resume.experiences.some((e) => /\d+\s?(%|x|users|clients|hours|projects)|\d{2,}/i.test(e.description));

    const content = clamp(35 + Math.min(resume.summary.length, 300) / 300 * 30 + Math.min(bulletChars, 900) / 900 * 35);
    const keywords = clamp(35 + Math.min(found.length, 14) / 14 * 65);
    const experience = clamp(25 + Math.min(resume.experiences.length, 3) * 15 + (hasMetrics ? 30 : 0));
    const formatting = clamp(50 + [resume.fullName, resume.email, resume.phone, resume.headline, resume.education.length ? "x" : ""].filter(Boolean).length * 10);
    const skills = clamp(30 + Math.min(resume.skills.length, 10) * 7);
    const sections = [
      { label: "Content", score: content }, { label: "Keywords", score: keywords }, { label: "Experience", score: experience },
      { label: "Formatting", score: formatting }, { label: "Skills", score: skills },
    ];
    const score = clamp(content * 0.25 + keywords * 0.2 + experience * 0.25 + formatting * 0.1 + skills * 0.2);

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const suggestions: string[] = [];
    if (resume.skills.length >= 8) strengths.push(`Broad skills section with ${resume.skills.length} listed skills.`);
    else { weaknesses.push("Skills section is short."); suggestions.push("List at least 8–10 relevant tools and technologies you have actually used."); }
    if (hasMetrics) strengths.push("Experience includes measurable results.");
    else { weaknesses.push("Experience bullets do not show measurable impact."); suggestions.push("Add numbers to your bullets, e.g. “reduced page load time by 35%”."); }
    if (resume.summary.length >= 150) strengths.push("Professional summary gives clear context.");
    else { weaknesses.push("Professional summary is missing or very short."); suggestions.push("Write a 2–3 sentence summary with your target role, strongest skills and one achievement."); }
    if (resume.projects.length >= 2) strengths.push("Projects demonstrate hands-on, practical work.");
    else suggestions.push("Add 2–3 projects with the technologies used and a link to the code or live demo.");
    if (resume.certifications.length === 0) suggestions.push("Add relevant certifications or courses if you have them.");
    if (resume.education.length === 0) weaknesses.push("No education entry found.");
    if (!strengths.length) strengths.push("Your contact details and headline are in place.");
    if (missing.length) suggestions.push(`Consider adding relevant keywords you genuinely have experience with, such as ${missing.slice(0, 3).join(", ")}.`);

    return { score, sections, strengths, weaknesses, suggestions, keywordsFound: found, keywordsSuggested: missing.slice(0, 6) };
  }

  async analyzeATS(resume: ResumeSnapshot, jobKeywords: string[]): Promise<ATSResult> {
    const text = resumeText(resume);
    const keywords = [...new Set(jobKeywords.map((k) => k.trim()).filter(Boolean))];
    const matched = keywords.filter((k) => text.includes(k.toLowerCase()));
    const missing = keywords.filter((k) => !text.includes(k.toLowerCase()));

    const checks = [
      { label: "Contact information", passed: Boolean(resume.email && (resume.phone || resume.location)), detail: "Email plus phone or location should be present." },
      { label: "Professional summary", passed: resume.summary.length >= 80, detail: "A summary of at least a few sentences helps parsers and recruiters." },
      { label: "Work experience section", passed: resume.experiences.length > 0, detail: "At least one experience entry is expected." },
      { label: "Education section", passed: resume.education.length > 0, detail: "Most ATS profiles look for an education entry." },
      { label: "Skills section", passed: resume.skills.length >= 5, detail: "List at least 5 skills as plain text." },
      { label: "Standard section headings", passed: true, detail: "Resume sections use conventional headings (Experience, Education, Skills)." },
    ];
    const formatScore = checks.filter((c) => c.passed).length / checks.length;
    const keywordScore = keywords.length ? matched.length / keywords.length : 0;
    const score = clamp(keywordScore * 70 + formatScore * 30);

    const recommendations: string[] = [];
    if (missing.length) recommendations.push(`Add the missing keywords you truly have experience with: ${missing.slice(0, 5).join(", ")}.`);
    checks.filter((c) => !c.passed).forEach((c) => recommendations.push(`${c.label}: ${c.detail}`));
    if (!recommendations.length) recommendations.push("Your resume covers the job's keywords and structure well for this demo check.");

    return { score, matchedKeywords: matched, missingKeywords: missing, checks, recommendations };
  }

  async analyzeSkills({ userSkills, demand, totalJobs }: SkillAnalysisInput): Promise<SkillAnalysisResult> {
    const have = new Set(userSkills.map((s) => s.name.toLowerCase()));
    const strongest = [...userSkills].filter((s) => s.level >= 4).sort((a, b) => b.level - a.level).slice(0, 6);
    const gaps = demand
      .filter((d) => !have.has(d.name.toLowerCase()))
      .sort((a, b) => b.jobCount - a.jobCount)
      .slice(0, 8)
      .map((d) => {
        const share = totalJobs ? d.jobCount / totalJobs : 0;
        return { ...d, priority: (share >= 0.4 ? "High" : share >= 0.2 ? "Medium" : "Low") as "High" | "Medium" | "Low" };
      });
    const covered = demand.filter((d) => have.has(d.name.toLowerCase())).length;
    return { strongest, gaps, coverage: demand.length ? clamp((covered / demand.length) * 100) : 0 };
  }

  async getInterviewQuestions(category: import("@prisma/client").InterviewCategory, role: string, difficulty: Difficulty): Promise<InterviewQuestionDraft[]> {
    const count = difficulty === "EASY" ? 3 : difficulty === "MEDIUM" ? 4 : 5;
    return QUESTION_BANK[category].slice(0, count).map((q) => ({ ...q, text: q.text.replace("this role", `the ${role} role`) }));
  }

  async generateInterviewFeedback(
    question: { text: string; expectedKeywords: string[]; category: import("@prisma/client").InterviewCategory },
    answer: string,
    difficulty: Difficulty,
  ): Promise<InterviewFeedbackResult> {
    const words = answer.trim().split(/\s+/).length;
    const lower = answer.toLowerCase();
    const hits = question.expectedKeywords.filter((k) => lower.includes(k.toLowerCase()));
    const coverage = question.expectedKeywords.length ? hits.length / question.expectedKeywords.length : 0.5;
    const lengthScore = Math.min(words, 120) / 120;
    const hasExample = /(for example|for instance|when i|i once|in my|at my|during)/i.test(answer);
    const strict = difficulty === "HARD" ? 0.9 : difficulty === "MEDIUM" ? 1 : 1.08;
    const score = clamp((30 + coverage * 40 + lengthScore * 20 + (hasExample ? 10 : 0)) * strict, 0, 100);

    const notes: string[] = [];
    notes.push(words < 40 ? "Your answer is quite short; aim for roughly 60–120 words with a clear structure." : "Good length and level of detail.");
    if (hits.length) notes.push(`You touched on: ${hits.slice(0, 4).join(", ")}.`);
    const missed = question.expectedKeywords.filter((k) => !hits.includes(k));
    if (missed.length) notes.push(`Consider covering: ${missed.slice(0, 3).join(", ")}.`);
    if (!hasExample) notes.push("Add a concrete example from your own experience.");
    notes.push("(Demo feedback based on keyword and length heuristics, not a real interviewer or AI model.)");
    return { score, feedback: notes.join(" ") };
  }
}
