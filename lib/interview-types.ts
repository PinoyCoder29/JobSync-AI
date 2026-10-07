import type { InterviewCategory } from "@prisma/client";

/** Interview types the user can pick. Role-based types are TECHNICAL interviews with a focus. */
export const INTERVIEW_TYPES = {
  HR: { label: "HR Interview", category: "HR", focus: "HR / general", icon: "bi-people" },
  BEHAVIORAL: { label: "Behavioral Interview", category: "BEHAVIORAL", focus: "Behavioral", icon: "bi-chat-heart" },
  TECHNICAL: { label: "Technical Interview", category: "TECHNICAL", focus: "General technical", icon: "bi-cpu" },
  SITUATIONAL: { label: "Situational Interview", category: "SITUATIONAL", focus: "Situational judgement", icon: "bi-signpost-split" },
  FRONTEND: { label: "Frontend Developer", category: "TECHNICAL", focus: "Frontend Developer", icon: "bi-window-stack" },
  BACKEND: { label: "Backend Developer", category: "TECHNICAL", focus: "Backend Developer", icon: "bi-hdd-network" },
  FULLSTACK: { label: "Full Stack Developer", category: "TECHNICAL", focus: "Full Stack Developer", icon: "bi-layers" },
  CUSTOM_JOB: { label: "Custom Job Interview", category: "TECHNICAL", focus: "Specific job", icon: "bi-briefcase" },
} as const satisfies Record<string, { label: string; category: InterviewCategory; focus: string; icon: string }>;

export type InterviewTypeKey = keyof typeof INTERVIEW_TYPES;
export const INTERVIEW_TYPE_KEYS = Object.keys(INTERVIEW_TYPES) as [InterviewTypeKey, ...InterviewTypeKey[]];

export type LiveReport = {
  overall: number;
  communication: number;
  technicalKnowledge: number;
  confidence: number;
  problemSolving: number;
  strengths: string[];
  improvements: string[];
  summary: string;
  recommended: InterviewCategory[];
  answered: number;
  total: number;
  isDemo: boolean;
};

export type AnswerDimensions = { score: number; communication: number; technical: number; confidence: number; problemSolving: number };
