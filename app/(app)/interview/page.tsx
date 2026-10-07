import type { Metadata } from "next";
import Link from "next/link";
import { AnswerForm } from "@/components/interview/AnswerForm";
import { StartInterviewForm } from "@/components/interview/StartInterviewForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CATEGORY_LABEL, DIFFICULTY_LABEL, formatDate, scoreTone } from "@/lib/labels";
import { requireUserId } from "@/lib/session";
import { interviewService } from "@/services/interview.service";
import { profileService } from "@/services/profile.service";

export const metadata: Metadata = { title: "Interview preparation" };

export default async function InterviewPage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const userId = await requireUserId();
  const { session: sessionId } = await searchParams;
  const [sessions, profile, active] = await Promise.all([
    interviewService.listSessions(userId),
    profileService.get(userId),
    sessionId ? interviewService.getSession(userId, sessionId) : Promise.resolve(null),
  ]);
  const answered = active?.questions.filter((q) => q.answer).length ?? 0;
  const firstOpen = active?.questions.find((q) => !q.answer);

  return (
    <div>
      <h1 className="page-title">Interview preparation</h1>
      <Link href="/interview/live" className="live-promo mb-4">
        <span className="live-promo-icon"><i className="bi bi-mic-fill" aria-hidden="true" /></span>
        <span className="min-w-0"><strong className="d-block">Try the AI Interviewer</strong><span className="small text-muted">It speaks to you, listens to your answers, asks follow-up questions and gives you a full report.</span></span>
        <i className="bi bi-arrow-right ms-auto" aria-hidden="true" />
      </Link>
      <p className="text-muted mb-4">Classic practice: a fixed question set, written answers and keyword-based demo feedback.</p>
      <div className="row g-4">
        <aside className="col-lg-4">
          <div className="side-panel mb-4">
            <h2 className="sub-title">New practice session</h2>
            <StartInterviewForm defaultRole={profile.profile?.targetRoles[0] ?? "Junior Full Stack Developer"} />
          </div>
          {sessions.some((s) => s.mode === "LIVE") && (
            <>
              <h2 className="sub-title">AI interviews</h2>
              <ul className="session-list mb-4">
                {sessions.filter((s) => s.mode === "LIVE").slice(0, 6).map((s) => (
                  <li key={s.id}><Link href={`/interview/live/${s.id}`}><strong>{s.focus ?? CATEGORY_LABEL[s.category]}</strong> · {s.jobRole}<span className="d-block small text-muted">{formatDate(s.createdAt)}{s.status === "IN_PROGRESS" ? " · in progress" : s.score !== null ? ` · score ${s.score}` : ""}</span></Link></li>
                ))}
              </ul>
            </>
          )}
          <h2 className="sub-title">Past practice sessions</h2>
          {sessions.filter((s) => s.mode === "CLASSIC").length === 0 ? <p className="text-muted small">Your sessions will appear here.</p> : (
            <ul className="session-list">
              {sessions.filter((s) => s.mode === "CLASSIC").map((s) => {
                const done = s.questions.filter((q) => q.answer).length;
                return (
                  <li key={s.id} className={s.id === sessionId ? "active" : ""}>
                    <Link href={`/interview?session=${s.id}`}>
                      <strong>{CATEGORY_LABEL[s.category]}</strong> · {s.jobRole}
                      <span className="d-block small text-muted">{formatDate(s.createdAt)} · {done}/{s.questions.length} answered{s.score !== null ? ` · score ${s.score}` : ""}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section className="col-lg-8">
          {!active ? (
            <EmptyState icon="bi-chat-square-text" title="Pick a session or start a new one" text="Choose a category, role and difficulty on the left to get your first questions." />
          ) : (
            <>
              <div className="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-2">
                <div>
                  <h2 className="section-title mb-0">{CATEGORY_LABEL[active.category]} interview · {active.jobRole}</h2>
                  <p className="text-muted mb-0">{DIFFICULTY_LABEL[active.difficulty]} difficulty</p>
                </div>
                {active.score !== null && <span className={`match-pill tone-${scoreTone(active.score)}`}>Session score {active.score}</span>}
              </div>
              <div className="mb-4"><ProgressBar value={Math.round((answered / active.questions.length) * 100)} label={`${answered} of ${active.questions.length} answered`} /></div>

              <ol className="question-list">
                {active.questions.map((q, i) => (
                  <li key={q.id}>
                    <h3 className="h6 fw-bold">Question {i + 1}: {q.text}</h3>
                    {q.answer ? (
                      <div className="answer-box">
                        <p className="mb-2">{q.answer.answer}</p>
                        <p className="mb-1"><span className={`match-pill tone-${scoreTone(q.answer.score)}`}>{q.answer.score}/100</span></p>
                        <p className="small mb-0">{q.answer.feedback}</p>
                      </div>
                    ) : firstOpen?.id === q.id ? (
                      <>
                        {q.hint && <p className="small text-muted">Hint: {q.hint}</p>}
                        <AnswerForm sessionId={active.id} questionId={q.id} />
                      </>
                    ) : <p className="small text-muted">Answer the previous question first.</p>}
                  </li>
                ))}
              </ol>
              {active.status === "COMPLETED" && <p className="fw-semibold">Session complete. Start another category to keep practicing.</p>}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
