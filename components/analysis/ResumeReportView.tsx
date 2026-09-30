import { ScoreRing } from "@/components/ui/ScoreRing";
import type { ResumeReport } from "@/services/analysis/schemas";
import { Badges, Bullets, Panel, ReportFooter, Rewrites, ScoreBreakdown, scoreBand } from "./ReportParts";

const LABELS = { content: "Content", experience: "Experience", skills: "Skills", projects: "Projects", education: "Education", formatting: "Formatting", atsReadiness: "ATS readiness" };
const WEIGHTS = "Content 20% · Experience 20% · Skills 15% · ATS readiness 15% · Projects 10% · Education 10% · Formatting 10%";

export function ResumeReportView({ report, createdAt, model, truncated }: { report: ResumeReport; createdAt: Date; model: string | null; truncated: boolean }) {
  const band = scoreBand(report.overallScore);
  const r = report;
  return (
    <div className="d-grid gap-4">
      <section className="report-hero" aria-label="Score">
        <ScoreRing value={r.overallScore} label="Overall" size={150} />
        <div className="flex-grow-1">
          <p className="match-big mb-1">{r.overallScore} <span className="fs-5 text-muted">/ 100</span></p>
          <p className="fw-semibold mb-2"><i className={`bi ${band.icon} me-1`} aria-hidden="true" />{band.text}</p>
          <details className="small">
            <summary>How this score is calculated</summary>
            <p className="mb-1 mt-2">The overall score is the weighted average of the seven category scores below: {WEIGHTS}.</p>
            <p className="text-muted mb-0">It measures how complete and clear the resume is. It is not a prediction of interviews or hiring.</p>
          </details>
        </div>
        <div className="report-bars"><ScoreBreakdown scores={r.scores} labels={LABELS} /></div>
      </section>
      {truncated && <div className="alert alert-warning mb-0" role="status">Your resume was very long, so only the first part was analyzed.</div>}

      <div className="row g-4">
        <div className="col-lg-6"><Panel title="Strengths" icon="bi-check-circle" id="strengths"><Bullets items={r.strengths} icon="bi-check-lg" empty="No clear strengths were found yet." /></Panel></div>
        <div className="col-lg-6"><Panel title="Weaknesses" icon="bi-exclamation-triangle" id="weak"><Bullets items={r.weaknesses} icon="bi-exclamation-lg" empty="No major weaknesses found." /></Panel></div>
      </div>

      <Panel title="Missing information" icon="bi-question-circle" id="missing">
        <div className="row g-3">
          <div className="col-md-6"><h4 className="mini-title">Important</h4><Bullets items={r.missingInformation.important} icon="bi-exclamation-circle" empty="Nothing important is missing." /></div>
          <div className="col-md-6"><h4 className="mini-title">Optional</h4><Bullets items={r.missingInformation.optional} icon="bi-plus-circle" empty="No optional additions suggested." /></div>
        </div>
      </Panel>

      <Panel title="Priority improvements" icon="bi-flag" id="priority">
        <div className="row g-3">
          {([["High priority", r.priorityImprovements.high, "bi-arrow-up-circle"], ["Medium priority", r.priorityImprovements.medium, "bi-dash-circle"], ["Low priority", r.priorityImprovements.low, "bi-arrow-down-circle"]] as const).map(([label, items, icon]) => (
            <div className="col-md-4" key={label}><h4 className="mini-title"><i className={`bi ${icon} me-1`} aria-hidden="true" />{label}</h4><Bullets items={items} empty="None" /></div>
          ))}
        </div>
      </Panel>

      <div className="row g-4">
        <div className="col-lg-6">
          <Panel title="Professional summary" icon="bi-person-lines-fill" id="summary">
            <Bullets items={r.summary.issues} icon="bi-exclamation-lg" empty="No issues found." />
            <Bullets items={r.summary.suggestions} icon="bi-lightbulb" empty="" />
            {r.summary.rewrite && (
              <div className="rewrite mt-3"><span className="rewrite-tag suggested">Suggested rewrite</span><p className="mb-1">{r.summary.rewrite}</p><p className="small text-muted mb-0">Built only from facts already in your resume. Edit it to sound like you.</p></div>
            )}
          </Panel>
        </div>
        <div className="col-lg-6">
          <Panel title="Experience" icon="bi-briefcase" id="exp">
            <Bullets items={r.experience.issues} icon="bi-exclamation-lg" empty="No issues found." />
            <Bullets items={r.experience.suggestions} icon="bi-lightbulb" empty="" />
            <Rewrites items={r.experience.rewrites} heading="Before / after" />
          </Panel>
        </div>
        <div className="col-lg-6">
          <Panel title="Skills" icon="bi-tools" id="skills">
            <h4 className="mini-title">Found in your resume</h4><Badges items={r.skills.found} tone="have" empty="No skills found." />
            <h4 className="mini-title mt-3">Suggestions</h4><Bullets items={r.skills.suggestions} icon="bi-lightbulb" empty="No suggestions." />
            <h4 className="mini-title mt-3">Listed without supporting evidence</h4><Badges items={r.skills.unsupported} tone="missing" empty="None. Your listed skills are backed up." />
          </Panel>
        </div>
        <div className="col-lg-6">
          <Panel title="Projects" icon="bi-code-square" id="proj">
            <Bullets items={r.projects.issues} icon="bi-exclamation-lg" empty="No issues found." />
            <Bullets items={r.projects.suggestions} icon="bi-lightbulb" empty="" />
            <Rewrites items={r.projects.rewrites} heading="Before / after" />
          </Panel>
        </div>
        <div className="col-lg-6">
          <Panel title="Education" icon="bi-mortarboard" id="edu">
            <Bullets items={r.education.issues} icon="bi-exclamation-lg" empty="No issues found." />
            <Bullets items={r.education.suggestions} icon="bi-lightbulb" empty="" />
          </Panel>
        </div>
        <div className="col-lg-6">
          <Panel title="Certifications" icon="bi-award" id="cert">
            <Bullets items={r.certifications.issues} icon="bi-exclamation-lg" empty="No issues found." />
            <Bullets items={r.certifications.suggestions} icon="bi-lightbulb" empty="" />
          </Panel>
        </div>
      </div>

      <Panel title="Grammar and wording" icon="bi-spellcheck" id="grammar">
        {r.grammar.issues.length === 0 ? <p className="text-muted small mb-0">No grammar or spelling issues found.</p> : (
          <div className="grammar-list">
            {r.grammar.issues.map((g, i) => (
              <div className="grammar-item" key={i}>
                <p className="mb-1"><span className="rewrite-tag">Original</span> {g.original}</p>
                <p className="mb-1"><span className="rewrite-tag issue">Problem</span> {g.problem}</p>
                <p className="mb-0"><span className="rewrite-tag suggested">Suggested</span> {g.correction}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Keywords" icon="bi-hash" id="keywords">
        <h4 className="mini-title">Found</h4><Badges items={r.keywords.found} tone="have" empty="No tracked keywords found." />
        <h4 className="mini-title mt-3">Worth adding, only if they're true for you</h4><Badges items={r.keywords.suggested} tone="missing" empty="No keyword suggestions." />
      </Panel>

      <ReportFooter createdAt={createdAt} model={model} note="Scores are estimates to help you improve, not a guarantee of interviews or hiring." />
    </div>
  );
}
