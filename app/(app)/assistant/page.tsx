import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "AI Career Assistant" };

const TOOLS = [
  { href: "/resume-analyzer", icon: "bi-file-earmark-check", title: "Resume Analyzer", text: "Get feedback on your resume's structure, wording and impact." },
  { href: "/ats-checker", icon: "bi-check2-square", title: "ATS Checker", text: "Compare your resume with a specific job and see which keywords are missing." },
  { href: "/skill-analysis", icon: "bi-bar-chart-steps", title: "Skill gap analysis", text: "See how your skills line up with what open jobs ask for." },
  { href: "/interview", icon: "bi-chat-square-text", title: "Interview practice", text: "Rehearse HR, behavioral, technical and situational questions." },
];

/** A hub for the existing AI-powered tools. A conversational assistant isn't built yet, so none is pretended here. */
export default function AssistantPage() {
  return (
    <div>
      <h1 className="page-title">AI Career Assistant</h1>
      <p className="text-muted mb-4">Your career tools in one place. They use your profile, resume and saved jobs.</p>
      <div className="row g-3">
        {TOOLS.map((t) => (
          <div className="col-12 col-md-6" key={t.href}>
            <Link href={t.href} className="feature h-100 d-block text-decoration-none text-body"><i className={`bi ${t.icon}`} aria-hidden="true" /><h2 className="sub-title">{t.title}</h2><p className="text-muted mb-0">{t.text}</p></Link>
          </div>
        ))}
      </div>
    </div>
  );
}
