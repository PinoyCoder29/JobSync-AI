import type { InterviewCategory } from "@prisma/client";
import type { InterviewQuestionDraft } from "./types";

export const QUESTION_BANK: Record<InterviewCategory, InterviewQuestionDraft[]> = {
  HR: [
    { text: "Tell me about yourself and why you are interested in this role.", hint: "Present, past, future: current focus, relevant experience, why this role.", expectedKeywords: ["experience", "skills", "role", "team", "learn"] },
    { text: "What are your greatest strengths, and how have they helped you at work or school?", hint: "Pick 2 strengths and back each with a short example.", expectedKeywords: ["strength", "example", "result", "team"] },
    { text: "Where do you see yourself in three years?", hint: "Connect your growth to the company's needs.", expectedKeywords: ["grow", "learn", "goal", "contribute"] },
    { text: "What are your salary expectations, and how did you arrive at that range?", hint: "Give a range and mention market research.", expectedKeywords: ["range", "market", "research", "flexible"] },
    { text: "Why are you leaving your current situation, or what have you been doing recently?", hint: "Stay positive and forward-looking.", expectedKeywords: ["growth", "opportunity", "learned", "project"] },
  ],
  BEHAVIORAL: [
    { text: "Describe a time you had a disagreement with a teammate. How did you handle it?", hint: "Use STAR: Situation, Task, Action, Result.", expectedKeywords: ["situation", "task", "action", "result", "listen", "team"] },
    { text: "Tell me about a project that did not go as planned. What did you learn?", hint: "Own your part and focus on what changed afterwards.", expectedKeywords: ["mistake", "learned", "improve", "deadline", "result"] },
    { text: "Give an example of when you had to learn a new technology quickly.", hint: "Explain your learning method and the outcome.", expectedKeywords: ["learn", "documentation", "practice", "project", "result"] },
    { text: "Describe a time you took initiative without being asked.", hint: "Show ownership and measurable impact.", expectedKeywords: ["initiative", "problem", "action", "impact", "result"] },
    { text: "Tell me about a time you received critical feedback. What did you do with it?", hint: "Show openness and follow-through.", expectedKeywords: ["feedback", "improve", "action", "learned", "result"] },
  ],
  TECHNICAL: [
    { text: "Explain the difference between server components and client components in Next.js. When would you use each?", hint: "Think about interactivity, bundle size and data fetching.", expectedKeywords: ["server", "client", "interactivity", "bundle", "fetch", "use client"] },
    { text: "How would you design a REST API for a job application tracker? Which endpoints and status codes would you use?", hint: "Resources, verbs, validation, auth.", expectedKeywords: ["GET", "POST", "status", "validation", "authentication", "resource"] },
    { text: "What is the difference between an SQL INNER JOIN and a LEFT JOIN? Give an example.", hint: "Describe which rows each returns.", expectedKeywords: ["join", "rows", "null", "table", "match"] },
    { text: "How do you prevent one user from reading another user's data in a web application?", hint: "Session identity, ownership checks, never trusting client IDs.", expectedKeywords: ["authorization", "session", "ownership", "server", "validate", "userId"] },
    { text: "Explain how you would improve the performance of a slow React page.", hint: "Measure first, then optimise rendering, data, assets.", expectedKeywords: ["profile", "memo", "render", "lazy", "cache", "measure"] },
    { text: "What are database indexes, and what is the trade-off of adding many of them?", hint: "Reads vs writes and storage.", expectedKeywords: ["index", "read", "write", "query", "storage", "trade-off"] },
  ],
  SITUATIONAL: [
    { text: "You discover a bug in production an hour before the end of your shift. What do you do?", hint: "Assess impact, communicate, fix or roll back, follow up.", expectedKeywords: ["impact", "communicate", "rollback", "fix", "team", "document"] },
    { text: "Your manager gives you two urgent tasks with conflicting deadlines. How do you respond?", hint: "Clarify priorities rather than guessing.", expectedKeywords: ["priority", "clarify", "communicate", "deadline", "trade-off"] },
    { text: "A teammate keeps missing code review deadlines and it is blocking you. What is your approach?", hint: "Talk to them first, escalate only if needed.", expectedKeywords: ["talk", "understand", "support", "escalate", "process"] },
    { text: "A client asks for a feature that is not in scope and the deadline is close. What do you do?", hint: "Protect scope, offer options.", expectedKeywords: ["scope", "estimate", "options", "communicate", "prioritize"] },
    { text: "You are asked to work with a tool you have never used. How do you get productive?", hint: "Describe a concrete plan and how you ask for help.", expectedKeywords: ["documentation", "practice", "ask", "small", "plan"] },
  ],
};
