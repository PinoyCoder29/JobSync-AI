import { ScoreRing } from "@/components/ui/ScoreRing";
import type { ATSReport } from "@/services/analysis/schemas";
import { Badges, Bullets, Panel, ReportFooter, ScoreBreakdown, scoreBand } from "./ReportParts";

const LABELS = { keywordMatch: "Keyword match", skillsMatch: "Skills match", experienceMatch: "Experience match", educationMatch: "Education match", atsStructure: "ATS structure" };
const WEIGHTS = "Keyword match 30% · Skills match 30% · Experience match 20% · Education match 10% · ATS structure 10%";

const CHECK = {
  pass: { icon: "bi-check-circle-fill", text: "Passed" },
  warning: { icon: "bi-exclamation-circle-fill", text: "Warning" },
  concern: { icon: "bi-exclamation-triangle-fill", text: "Potential ATS concern" },
} as const;

export function ATSReportView({ report, createdAt, model, truncated, jobTitle, jobCompany }: {
  report: ATSReport; createdAt: Date; model: string | null; truncated: boolean; jobTitle: string | null; jobCompany: string | null;
}) {
  const r = report;
  const band = scoreBand(r.overallScore);
  const grouped = r.resumeChanges.reduce<Record<string, string[]>>((acc, c) => {
    (acc[c.section || "General"] ??= []).push(c.suggestion);
    return acc;
  }, {});

  return (
    <div className="d-grid gap-4">
      <section className="report-hero" aria-label="Match score">
        <ScoreRing value={r.overallScore} label="Match" size={150} />
        <div className="flex-grow-1">
          {(jobTitle || jobCompany) && <p className="text-muted mb-1">Compared with <strong>{[jobTitle, jobCompany].filter(Boolean).join(" · ")}</strong></p>}
          <p className="match-big mb-1">{r.overallScore} <span className="fs-5 text-muted">/ 100 match</span></p>
          <p className="fw-semibold mb-2"><i className={`bi ${band.icon} me-1`} aria-hidden="true" />{band.text}</p>
          <details className="small">
            <summary>How this score is calculated</summary>
            <p className="mb-1 mt-2">Weighted average of the five scores: {WEIGHTS}. Keyword and skills scores are counted from the words actually found in your resume.</p>
            <p className="text-muted mb-0">It describes how closely the two documents overlap. It is not a prediction of hiring success.</p>
          </details>
        </div>
        <div className="report-bars"><ScoreBreakdown scores={r.scores} labels={LABELS} /></div>
      </section>
      {truncated && <div className="alert alert-warning mb-0" role="status">One of the documents was very long, so only the first part was compared.</div>}

      <div className="row g-4">
        <div className="col-lg-6"><Panel title={`Matched keywords (${r.matchedKeywords.length})`} icon="bi-check-circle" id="mk"><Badges items={r.matchedKeywords} tone="have" empty="No keywords matched." /></Panel></div>
        <div className="col-lg-6">
          <Panel title={`Missing keywords (${r.missingKeywords.length})`} icon="bi-x-circle" id="xk">
            <Badges items={r.missingKeywords} tone="missing" empty="No missing keywords." />
            {r.relatedKeywords.length > 0 && (<><h4 className="mini-title mt-3">Related (not exact)</h4><Badges items={r.relatedKeywords} tone="neutral" /></>)}
            <p className="small text-muted mt-3 mb-0">Only add a keyword if it's true for you. Keyword stuffing can hurt.</p>
          </Panel>
        </div>
      </div>

      <Panel title="Skills match" icon="bi-tools" id="sk">
        <div className="row g-3">
          <div className="col-md-3"><h4 className="mini-title">Matched</h4><Badges items={r.matchedSkills} tone="have" /></div>
          <div className="col-md-3"><h4 className="mini-title">Missing</h4><Badges items={r.missingSkills} tone="missing" /></div>
          <div className="col-md-3"><h4 className="mini-title">Related</h4><Badges items={r.relatedSkills} tone="neutral" /></div>
          <div className="col-md-3"><h4 className="mini-title">Listed without evidence</h4><Badges items={r.unsupportedSkills} tone="missing" /></div>
        </div>
      </Panel>

      <div className="row g-4">
        <div className="col-lg-6">
          <Panel title="Experience match" icon="bi-briefcase" id="em">
            <h4 className="mini-title">Matches</h4><Bullets items={r.experienceMatch.matches} icon="bi-check-lg" empty="No clear matches found." />
            <h4 className="mini-title mt-3">Gaps</h4><Bullets items={r.experienceMatch.gaps} icon="bi-exclamation-lg" empty="No gaps found." />
          </Panel>
        </div>
        <div className="col-lg-6">
          <Panel title="Education match" icon="bi-mortarboard" id="ed">
            <h4 className="mini-title">Matches</h4><Bullets items={r.educationMatch.matches} icon="bi-check-lg" empty="Not specified." />
            <h4 className="mini-title mt-3">Potential gaps</h4><Bullets items={r.educationMatch.gaps} icon="bi-exclamation-lg" empty="No gaps found." />
          </Panel>
        </div>
      </div>

      <Panel title="ATS issues" icon="bi-shield-check" id="checks">
        {r.atsChecks.length === 0 ? <p className="text-muted small mb-0">No structure checks were returned.</p> : (
          <ul className="check-table">
            {r.atsChecks.map((c, i) => {
              const meta = CHECK[c.status];
              return (
                <li key={i} className={`check-${c.status}`}>
                  <i className={`bi ${meta.icon}`} aria-hidden="true" />
                  <div><strong>{c.label}</strong> <span className="status-text">{meta.text}</span>{c.detail && <div className="small text-muted">{c.detail}</div>}</div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <div className="row g-4">
        <div className="col-lg-6"><Panel title="Recommendations" icon="bi-lightbulb" id="rec"><Bullets items={r.recommendations} icon="bi-arrow-right-short" empty="No recommendations." /></Panel></div>
        <div className="col-lg-6">
          <Panel title="Recommended resume changes" icon="bi-pencil-square" id="chg">
            {Object.keys(grouped).length === 0 ? <p className="text-muted small mb-0">No changes suggested.</p> : Object.entries(grouped).map(([section, items]) => (
              <div key={section} className="mb-3"><h4 className="mini-title">{section}</h4><Bullets items={items} icon="bi-pencil" /></div>
            ))}
          </Panel>
        </div>
      </div>

      <ReportFooter createdAt={createdAt} model={model} note="This compares two documents. It doesn't predict hiring decisions or guarantee how any employer's ATS will read your resume." />
    </div>
  );
}
