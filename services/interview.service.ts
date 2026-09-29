import type { Difficulty, InterviewCategory } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { interviewRepository } from "@/repositories/interview.repository";
import { getAIProvider } from "./ai";

export const interviewService = {
  listSessions: (userId: string) => interviewRepository.listSessions(userId),
  getSession: (userId: string, id: string) => interviewRepository.findOwnedSession(id, userId),

  async start(userId: string, input: { category: InterviewCategory; jobRole: string; difficulty: Difficulty }) {
    const questions = await getAIProvider().getInterviewQuestions(input.category, input.jobRole, input.difficulty);
    return interviewRepository.createSession(userId, input, questions);
  },

  async answer(userId: string, input: { sessionId: string; questionId: string; answer: string }) {
    const session = await interviewRepository.findOwnedSession(input.sessionId, userId); // ownership check
    if (!session) throw new AppError("Interview session not found.", "NOT_FOUND");
    const question = session.questions.find((q) => q.id === input.questionId); // question must belong to that session
    if (!question) throw new AppError("Question not found.", "NOT_FOUND");
    if (question.answer) throw new AppError("This question has already been answered.");
    const fb = await getAIProvider().generateInterviewFeedback(
      { text: question.text, expectedKeywords: question.expectedKeywords, category: session.category },
      input.answer,
      session.difficulty,
    );
    await interviewRepository.saveAnswer(session.id, question.id, input.answer, fb.score, fb.feedback);
  },
};
