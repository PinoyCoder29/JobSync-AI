import type { Difficulty, InterviewCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type NewQuestion = { text: string; hint?: string; expectedKeywords: string[] };

export const interviewRepository = {
  listSessions(userId: string) {
    return prisma.interviewSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { questions: { select: { id: true, answer: { select: { id: true } } } } },
    });
  },
  findOwnedSession(id: string, userId: string) {
    return prisma.interviewSession.findFirst({
      where: { id, userId },
      include: { questions: { orderBy: { sortOrder: "asc" }, include: { answer: true } } },
    });
  },
  count(userId: string) {
    return prisma.interviewSession.count({ where: { userId } });
  },
  createSession(userId: string, data: { category: InterviewCategory; jobRole: string; difficulty: Difficulty }, questions: NewQuestion[]) {
    return prisma.interviewSession.create({
      data: { userId, ...data, questions: { create: questions.map((q, i) => ({ ...q, sortOrder: i })) } },
      select: { id: true },
    });
  },
  /** Saves the answer and, when every question is answered, completes the session – atomically. */
  saveAnswer(sessionId: string, questionId: string, answer: string, score: number, feedback: string) {
    return prisma.$transaction(async (tx) => {
      await tx.interviewAnswer.upsert({
        where: { questionId },
        create: { questionId, answer, score, feedback },
        update: { answer, score, feedback },
      });
      const questions = await tx.interviewQuestion.findMany({ where: { sessionId }, include: { answer: true } });
      const answered = questions.filter((q) => q.answer);
      if (answered.length === questions.length) {
        const avg = Math.round(answered.reduce((sum, q) => sum + (q.answer?.score ?? 0), 0) / answered.length);
        await tx.interviewSession.update({ where: { id: sessionId }, data: { status: "COMPLETED", score: avg, completedAt: new Date() } });
      }
    });
  },

  // ───────── LIVE (AI interviewer) sessions ─────────
  createLive(userId: string, data: { category: InterviewCategory; jobRole: string; difficulty: Difficulty; focus: string; jobId?: string; jobDescription?: string; maxQuestions: number }, first: NewQuestion) {
    return prisma.interviewSession.create({
      data: { userId, mode: "LIVE", ...data, questions: { create: [{ ...first, sortOrder: 0 }] } },
      select: { id: true, questions: { select: { id: true } } },
    });
  },
  appendQuestion(sessionId: string, q: NewQuestion & { isFollowUp: boolean }, sortOrder: number) {
    return prisma.interviewQuestion.create({ data: { sessionId, sortOrder, ...q }, select: { id: true } });
  },
  /** The unique questionId makes a double-submit fail instead of saving two answers. */
  saveLiveAnswer(questionId: string, answer: string, score: number, feedback: string, details: object) {
    return prisma.interviewAnswer.create({ data: { questionId, answer, score, feedback, details }, select: { id: true } });
  },
  completeLive(sessionId: string, score: number | null, report: object | null) {
    return prisma.interviewSession.update({ where: { id: sessionId }, data: { status: "COMPLETED", score, report: report ?? undefined, completedAt: new Date() }, select: { id: true } });
  },
};
