import { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { INTERVIEW_TYPES, type AnswerDimensions, type LiveReport } from "@/lib/interview-types";
import { enforceRateLimit } from "@/lib/rate-limit";
import type { z } from "zod";
import type { startLiveSchema } from "@/lib/validations/live-interview";
import { interviewRepository } from "@/repositories/interview.repository";
import { jobRepository } from "@/repositories/job.repository";
import { isLiveDemo, liveAI, type LiveContext, type QA } from "./live-ai";

export type LiveQuestionDTO = { id: string; text: string; isFollowUp: boolean };
export type LiveStateDTO = {
  sessionId: string;
  status: "IN_PROGRESS" | "COMPLETED";
  type: string;
  role: string;
  focus: string;
  total: number;
  /** 1-based number of the question being asked now */
  index: number;
  question: LiveQuestionDTO | null;
  transcript: { question: string; answer: string }[];
  report: LiveReport | null;
  isDemo: boolean;
};

const NOT_FOUND = "We couldn't find that interview.";
type Owned = NonNullable<Awaited<ReturnType<typeof interviewRepository.findOwnedSession>>>;

const dimsOf = (details: unknown): (AnswerDimensions & { strength: string; improvement: string }) | null => {
  const d = details as Partial<AnswerDimensions & { strength: string; improvement: string }> | null;
  return d && typeof d.score === "number" ? ({ strength: "", improvement: "", communication: 0, technical: 0, confidence: 0, problemSolving: 0, ...d } as AnswerDimensions & { strength: string; improvement: string }) : null;
};

async function owned(userId: string, id: string): Promise<Owned> {
  const s = await interviewRepository.findOwnedSession(id, userId); // WHERE userId: another user's id is just "not found"
  if (!s || s.mode !== "LIVE") throw new AppError(NOT_FOUND, "NOT_FOUND");
  return s;
}

const contextOf = (s: Owned): LiveContext => ({ type: s.focus ?? "interview", category: s.category, focus: s.focus ?? s.category, role: s.jobRole, difficulty: s.difficulty, jobText: s.jobDescription ?? "", total: s.maxQuestions });
const qaOf = (s: Owned): QA[] => s.questions.map((q) => ({ question: q.text, answer: q.answer?.answer ?? null, isFollowUp: q.isFollowUp }));

function toState(s: Owned): LiveStateDTO {
  const answered = s.questions.filter((q) => q.answer);
  const open = s.questions.find((q) => !q.answer) ?? null;
  return {
    sessionId: s.id,
    status: s.status,
    type: s.focus ?? s.category,
    role: s.jobRole,
    focus: s.focus ?? s.category,
    total: s.maxQuestions,
    index: Math.min(answered.length + 1, s.maxQuestions),
    question: s.status === "IN_PROGRESS" && open ? { id: open.id, text: open.text, isFollowUp: open.isFollowUp } : null,
    transcript: answered.map((q) => ({ question: q.text, answer: q.answer!.answer })),
    report: (s.report as LiveReport | null) ?? null,
    isDemo: isLiveDemo(),
  };
}

async function finalize(s: Owned): Promise<LiveReport | null> {
  const rows = s.questions.flatMap((q) => (q.answer ? [dimsOf(q.answer.details)].filter((x) => x !== null) : []));
  if (rows.length === 0) {
    await interviewRepository.completeLive(s.id, null, null);
    return null;
  }
  const report = await liveAI.report(contextOf(s), qaOf(s), rows, rows.length);
  await interviewRepository.completeLive(s.id, report.overall, report);
  return report;
}

export const liveInterviewService = {
  async start(userId: string, input: z.infer<typeof startLiveSchema>): Promise<LiveStateDTO & { greeting: string }> {
    enforceRateLimit(userId, "interviewStart");
    const type = INTERVIEW_TYPES[input.type];

    let jobText = input.jobDescription ?? "";
    let role = input.role?.trim() || type.focus;
    let jobId: string | undefined;
    if (input.jobId) {
      const job = await jobRepository.findById(input.jobId);
      if (!job) throw new AppError("We couldn't find that job.", "NOT_FOUND");
      jobId = job.id;
      role = job.title;
      jobText = [`${job.title} at ${job.company}`, job.description ?? "", job.skills?.map((k) => k.skill.name).join(", ")].filter(Boolean).join("\n").slice(0, 6000);
    } else if (input.type === "CUSTOM_JOB") role = input.role?.trim() || "the role in the job description";

    const ctx: LiveContext = { type: input.type, category: type.category, focus: type.focus, role, difficulty: input.difficulty, jobText, total: input.length };
    const opening = await liveAI.opening(ctx); // before any DB write: if the AI fails, nothing is left half-created
    const created = await interviewRepository.createLive(
      userId,
      { category: type.category, jobRole: role.slice(0, 80), difficulty: input.difficulty, focus: type.focus, jobId, jobDescription: jobText || undefined, maxQuestions: input.length },
      { text: opening.question, expectedKeywords: opening.expectedKeywords },
    );
    const state = await this.get(userId, created.id);
    return { ...state, greeting: opening.greeting };
  },

  async get(userId: string, sessionId: string): Promise<LiveStateDTO> {
    return toState(await owned(userId, sessionId));
  },

  /** Saves the answer AFTER the AI has evaluated it (so an AI failure leaves the question open to retry). */
  async answer(userId: string, sessionId: string, input: { questionId: string; answer: string }): Promise<{ acknowledgement: string; state: LiveStateDTO; done: boolean }> {
    enforceRateLimit(userId, "interviewTurn");
    const s = await owned(userId, sessionId);
    if (s.status !== "IN_PROGRESS") throw new AppError("This interview has finished.", "CONFLICT");
    const q = s.questions.find((x) => x.id === input.questionId);
    const open = s.questions.find((x) => !x.answer);
    if (!q || !open || q.id !== open.id) throw new AppError("That question was already answered.", "CONFLICT");

    const answeredAfter = s.questions.filter((x) => x.answer).length + 1;
    const isLast = answeredAfter >= s.maxQuestions;
    const qa = qaOf(s).map((t) => (t.question === q.text && t.answer === null ? { ...t, answer: input.answer } : t));
    const turn = await liveAI.turn(contextOf(s), qa, isLast);

    try {
      await interviewRepository.saveLiveAnswer(q.id, input.answer, turn.evaluation.score, turn.evaluation.improvement || turn.evaluation.strength, turn.evaluation);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AppError("That question was already answered.", "CONFLICT");
      throw error;
    }

    if (isLast || !turn.nextQuestion) {
      const fresh = await owned(userId, sessionId);
      await finalize(fresh);
      return { acknowledgement: turn.acknowledgement, state: await this.get(userId, sessionId), done: true };
    }
    await interviewRepository.appendQuestion(s.id, { text: turn.nextQuestion, expectedKeywords: turn.expectedKeywords, isFollowUp: turn.isFollowUp }, s.questions.length);
    return { acknowledgement: turn.acknowledgement, state: await this.get(userId, sessionId), done: false };
  },

  /** End early: the report covers what was answered. */
  async end(userId: string, sessionId: string): Promise<LiveStateDTO> {
    const s = await owned(userId, sessionId);
    if (s.status === "IN_PROGRESS") await finalize(s);
    return this.get(userId, sessionId);
  },
};
