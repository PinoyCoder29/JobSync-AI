"use client";

import Link from "next/link";

type Action = { label: string; icon: string; href?: string; ask?: string };

/** Quick actions either open the matching existing tool, or ask the AI chat directly. */
export const QUICK_ACTIONS: Action[] = [
  { label: "Analyze my resume", icon: "bi-file-earmark-check", href: "/resume-analyzer" },
  { label: "Find my skill gaps", icon: "bi-bar-chart-steps", href: "/skill-analysis" },
  { label: "Find jobs for me", icon: "bi-search", href: "/jobs" },
  { label: "Improve my resume", icon: "bi-pencil-square", ask: "How can I improve my resume?" },
  { label: "Practice interview", icon: "bi-mic", href: "/interview" },
  { label: "Explain my ATS score", icon: "bi-bullseye", ask: "Explain my ATS score and how to raise it." },
  { label: "Create an interview plan", icon: "bi-calendar-check", ask: "Create a 7-day interview preparation plan for me based on my skills and gaps." },
];

export function QuickActions() {
  return (
    <div className="quick-actions" role="list" aria-label="Quick actions">
      {QUICK_ACTIONS.map((a) =>
        a.href ? (
          <Link key={a.label} role="listitem" href={a.href} className="quick-chip"><i className={`bi ${a.icon}`} aria-hidden="true" />{a.label}</Link>
        ) : (
          <button key={a.label} role="listitem" type="button" className="quick-chip" onClick={() => { window.dispatchEvent(new CustomEvent("assistant:ask", { detail: a.ask })); document.getElementById("ai-q")?.scrollIntoView({ block: "center", behavior: "smooth" }); }}>
            <i className={`bi ${a.icon}`} aria-hidden="true" />{a.label}
          </button>
        ),
      )}
    </div>
  );
}
