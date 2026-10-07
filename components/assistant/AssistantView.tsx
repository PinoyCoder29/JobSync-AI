import Link from "next/link";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { QuickActions } from "@/components/assistant/QuickActions";
import type { NextStep } from "@/lib/assistant-steps";

const TOOLS = [
  { href: "/resume-analyzer", icon: "bi-file-earmark-text", title: "Resume Analyzer", text: "Improve your resume structure, wording and impact.", cta: "Open Analyzer" },
  { href: "/ats-checker", icon: "bi-bullseye", title: "ATS Checker", text: "Compare your resume against a specific job description.", cta: "Check ATS" },
  { href: "/skill-analysis", icon: "bi-bar-chart-steps", title: "Skill Gap Analysis", text: "Discover which skills you need for your target jobs.", cta: "Analyze Skills" },
  { href: "/interview", icon: "bi-mic", title: "AI Interview Practice", text: "Practice with an AI interviewer that asks questions dynamically.", cta: "Start Interview" },
];

function Score({ label, value, suffix = "", href, empty }: { label: string; value: number | null; suffix?: string; href: string; empty: string }) {
  return (
    <div className="score-card">
      <div className="score-label">{label}</div>
      {value === null ? (
        <>
          <div className="score-empty">Not yet</div>
          <Link href={href} className="small">{empty}</Link>
        </>
      ) : (
        <>
          <div className="score-value">{value}<span>{suffix}</span></div>
          <div className="score-bar" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}><span style={{ width: `${Math.min(100, value)}%` }} /></div>
        </>
      )}
    </div>
  );
}


export type AssistantViewData = { resumeScore: number | null; atsScore: number | null; coverage: number; readiness: number };

/** Presentational: the page fetches real data and passes it in. */
export function AssistantView({ data: d, steps }: { data: AssistantViewData; steps: NextStep[] }) {
  return (
    <div className="ai-page">
      <section className="ai-hero" aria-labelledby="ai-title">
        <div className="ai-hero-head">
          <span className="ai-badge"><i className="bi bi-stars" aria-hidden="true" /></span>
          <div className="min-w-0">
            <h1 id="ai-title" className="page-title mb-0">AI Career Assistant</h1>
            <p className="text-muted mb-0">Your AI-powered career workspace</p>
          </div>
        </div>
        <AssistantChat />
        <QuickActions />
      </section>

      <section className="ai-section" aria-labelledby="ov-title">
        <h2 id="ov-title" className="ai-h2">Career Overview</h2>
        <div className="score-grid">
          <Score label="Resume score" value={d.resumeScore} href="/resume-analyzer" empty="Analyze your resume" />
          <Score label="ATS score" value={d.atsScore} href="/ats-checker" empty="Run an ATS check" />
          <Score label="Skill match" value={d.coverage} suffix="%" href="/skill-analysis" empty="Run skill analysis" />
          <Score label="Career readiness" value={d.readiness} suffix="%" href="/profile" empty="Complete your profile" />
        </div>
      </section>

      <section className="ai-section" aria-labelledby="tools-title">
        <h2 id="tools-title" className="ai-h2">Career Tools</h2>
        <div className="tool-grid">
          {TOOLS.map((t) => (
            <Link key={t.href} href={t.href} className="tool-card">
              <span className="tool-icon"><i className={`bi ${t.icon}`} aria-hidden="true" /></span>
              <span className="tool-body">
                <span className="tool-title">{t.title}</span>
                <span className="tool-text">{t.text}</span>
              </span>
              <span className="tool-cta">{t.cta} <i className="bi bi-arrow-right" aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="ai-section" aria-labelledby="next-title">
        <h2 id="next-title" className="ai-h2">Recommended Next Steps</h2>
        {steps.length === 0 ? (
          <p className="text-muted">You&apos;re in great shape. Keep applying and practicing.</p>
        ) : (
          <ul className="next-list">
            {steps.map((s) => (
              <li key={s.text}><Link href={s.href} className="next-step"><i className={`bi ${s.icon}`} aria-hidden="true" /><span>{s.text}</span><i className="bi bi-chevron-right ms-auto" aria-hidden="true" /></Link></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
