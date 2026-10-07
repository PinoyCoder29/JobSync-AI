/**
 * Offline "demo interviewer" used ONLY when no AI key is configured. Deterministic heuristics (length, structure words,
 * hedging, topic words), clearly labelled as demo in the UI. Also home of the report maths used for BOTH modes, so
 * scores are computed the same auditable way no matter who wrote the feedback text.
 */
import type { InterviewCategory } from "@prisma/client";
import type { AnswerDimensions, LiveReport } from "@/lib/interview-types";

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);

const STRUCTURE = /\b(because|so that|therefore|as a result|result|trade-?off|decided|learned|instead|first|then|finally|for example|for instance)\b/gi;
const HEDGE = /\b(maybe|i guess|i think|not sure|kind of|sort of|probably|i don't know|um+|uh+)\b/gi;
const TECH = ["react", "next.js", "typescript", "javascript", "node", "postgresql", "sql", "prisma", "docker", "api", "rest", "graphql", "python", "java", "aws", "git", "testing", "redis", "css", "html", "machine learning", "cloud", "database", "authentication", "performance", "security"];

/** Heuristic per-answer scoring. Honest about being a heuristic: no pretending to understand the content. */
export function scoreAnswerDemo(answer: string, expectedKeywords: string[]): AnswerDimensions & { strength: string; improvement: string } {
  const w = words(answer).length;
  const lower = answer.toLowerCase();
  const kw = expectedKeywords.length ? expectedKeywords.filter((k) => lower.includes(k.toLowerCase())).length / expectedKeywords.length : 0.5;
  const structure = Math.min(4, (answer.match(STRUCTURE) ?? []).length);
  const hedges = Math.min(5, (answer.match(HEDGE) ?? []).length);
  const hasNumbers = /\d/.test(answer);

  const communication = clamp(35 + Math.min(w, 90) * 0.45 + structure * 5 - hedges * 2);
  const technical = clamp(30 + kw * 55 + (hasNumbers ? 5 : 0) + Math.min(w, 60) * 0.15);
  const confidence = clamp(80 - hedges * 9 + Math.min(w, 60) * 0.2);
  const problemSolving = clamp(35 + structure * 11 + (hasNumbers ? 6 : 0) + Math.min(w, 80) * 0.2);
  const score = clamp((communication + technical + confidence + problemSolving) / 4);

  return {
    score, communication, technical, confidence, problemSolving,
    strength: structure >= 2 ? "You explained your reasoning in clear steps." : w >= 40 ? "You gave a detailed answer." : "You answered directly.",
    improvement: w < 30 ? "Give a more specific example with details." : structure < 2 ? "Structure your answer: situation, action, result." : hedges >= 2 ? "Sound more certain; cut filler like “maybe” and “I think”." : "Mention measurable results or trade-offs.",
  };
}

/** Picks something the candidate actually said, to ask about it. */
export function extractTopic(answer: string): string | null {
  const lower = answer.toLowerCase();
  const hit = TECH.find((t) => new RegExp(`\\b${t.replace(/[.+]/g, "\\$&")}\\b`).test(lower));
  if (hit) return hit;
  const proper = answer.match(/\b[A-Z][a-zA-Z]{3,}\b/g)?.filter((p) => !/^(The|This|That|When|What|Then|There|Their|They|Because|Also|However|After|Before)$/.test(p));
  return proper?.[0] ?? null;
}

export type NextMove = { followUp: string | null };

/** Follow up if the answer was thin, or if there's something specific to dig into (but never twice in a row). */
export function followUpDemo(answer: string, previousWasFollowUp: boolean): NextMove {
  if (previousWasFollowUp) return { followUp: null };
  if (words(answer).length < 25) return { followUp: "Could you walk me through a specific example in more detail?" };
  const topic = extractTopic(answer);
  return { followUp: topic ? `You mentioned ${topic}. What was the hardest part of that, and what trade-offs did you make?` : null };
}

const avg = (xs: number[]) => (xs.length ? clamp(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

/** The numbers in the final report: plain averages of the per-answer scores. */
export function buildScores(answers: AnswerDimensions[]) {
  return {
    overall: avg(answers.map((a) => a.score)),
    communication: avg(answers.map((a) => a.communication)),
    technicalKnowledge: avg(answers.map((a) => a.technical)),
    confidence: avg(answers.map((a) => a.confidence)),
    problemSolving: avg(answers.map((a) => a.problemSolving)),
  };
}

/** Suggests what to practise next from the weakest dimensions. */
export function recommendPractice(scores: ReturnType<typeof buildScores>, current: InterviewCategory): InterviewCategory[] {
  const out: InterviewCategory[] = [];
  if (scores.technicalKnowledge < 70 || scores.problemSolving < 70) out.push("TECHNICAL");
  if (scores.communication < 70 || scores.confidence < 70) out.push("HR", "BEHAVIORAL");
  if (out.length === 0) out.push(current === "TECHNICAL" ? "BEHAVIORAL" : "TECHNICAL");
  return [...new Set(out)].slice(0, 3);
}

export function demoReportText(scores: ReturnType<typeof buildScores>, strengths: string[], improvements: string[]): Pick<LiveReport, "strengths" | "improvements" | "summary"> {
  const uniq = (xs: string[]) => [...new Set(xs)].slice(0, 4);
  return {
    strengths: uniq(strengths).length ? uniq(strengths) : ["You completed the interview."],
    improvements: uniq(improvements).length ? uniq(improvements) : ["Keep practising with specific examples."],
    summary: scores.overall >= 80 ? "A strong performance overall. Keep your answers specific and you'll stand out." : scores.overall >= 60 ? "A solid base. Focus on the improvement areas below and try again." : "A good start. Practise structuring answers with concrete examples, then retry.",
  };
}
