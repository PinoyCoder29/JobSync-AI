import type { Difficulty, InterviewCategory } from "@prisma/client";

export interface ResumeSnapshot {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  summary: string;
  skills: string[];
  experiences: { role: string; company: string; description: string; startDate: string; endDate: string }[];
  education: { school: string; degree: string }[];
  projects: { name: string; description: string; technologies: string }[];
  certifications: { name: string }[];
}

export interface ResumeAnalysisResult {
  score: number;
  sections: { label: string; score: number }[];
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  keywordsFound: string[];
  keywordsSuggested: string[];
}

export interface ATSResult {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  checks: { label: string; passed: boolean; detail: string }[];
  recommendations: string[];
}

export interface SkillAnalysisInput {
  userSkills: { name: string; level: number }[];
  demand: { name: string; jobCount: number }[];
  totalJobs: number;
}

export interface SkillAnalysisResult {
  strongest: { name: string; level: number }[];
  gaps: { name: string; jobCount: number; priority: "High" | "Medium" | "Low" }[];
  coverage: number;
}

export interface InterviewQuestionDraft {
  text: string;
  hint?: string;
  expectedKeywords: string[];
}

export interface InterviewFeedbackResult {
  score: number;
  feedback: string;
}

/**
 * Everything the app needs from an "AI" backend. The UI and services only talk to this interface,
 * so a real provider can replace MockAIProvider without touching pages or components.
 */
export interface AIProvider {
  readonly name: string;
  /** true while results come from deterministic demo logic and not a real model */
  readonly isDemo: boolean;
  analyzeResume(resume: ResumeSnapshot): Promise<ResumeAnalysisResult>;
  analyzeATS(resume: ResumeSnapshot, jobKeywords: string[]): Promise<ATSResult>;
  analyzeSkills(input: SkillAnalysisInput): Promise<SkillAnalysisResult>;
  getInterviewQuestions(category: InterviewCategory, role: string, difficulty: Difficulty): Promise<InterviewQuestionDraft[]>;
  generateInterviewFeedback(
    question: { text: string; expectedKeywords: string[]; category: InterviewCategory },
    answer: string,
    difficulty: Difficulty,
  ): Promise<InterviewFeedbackResult>;
}
