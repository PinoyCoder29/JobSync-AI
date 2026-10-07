import Link from "next/link";
import { INTERVIEW_TYPES, type InterviewTypeKey, type LiveReport } from "@/lib/interview-types";

const DIMS = [
  ["communication", "Communication"],
  ["technicalKnowledge", "Technical Knowledge"],
  ["confidence", "Confidence"],
  ["problemSolving", "Problem Solving"],
] as const;

const CATEGORY_TYPE: Record<string, InterviewTypeKey> = { HR: "HR", BEHAVIORAL: "BEHAVIORAL", TECHNICAL: "TECHNICAL", SITUATIONAL: "SITUATIONAL" };

export function InterviewReport({ report, retryType }: { report: LiveReport; retryType?: string }) {
  const tone = report.overall >= 80 ? "good" : report.overall >= 60 ? "ok" : "low";
  return (
    <div className="report">
      <h2 className="h4 mb-3">Interview Results</h2>
      <div className={`report-overall ${tone}`}>
        <div className="report-overall-label">Overall Score</div>
        <div className="report-overall-value">{report.overall}<span> / 100</span></div>
        <div className="small text-muted">{report.answered} of {report.total} questions answered{report.isDemo ? " · demo scoring" : ""}</div>
      </div>
      <div className="report-dims">
        {DIMS.map(([key, label]) => (
          <div key={key} className="report-dim">
            <div className="d-flex justify-content-between"><span>{label}</span><strong>{report[key]}</strong></div>
            <div className="score-bar" role="progressbar" aria-label={label} aria-valuenow={report[key]} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${report[key]}%` }} /></div>
          </div>
        ))}
      </div>
      {report.summary && <p className="mt-3">{report.summary}</p>}
      <div className="row g-3 mt-1">
        <div className="col-md-6"><h3 className="h6">Strengths</h3><ul className="report-list good">{report.strengths.map((s) => <li key={s}><i className="bi bi-check-lg" aria-hidden="true" />{s}</li>)}</ul></div>
        <div className="col-md-6"><h3 className="h6">Needs Improvement</h3><ul className="report-list">{report.improvements.map((s) => <li key={s}><i className="bi bi-dot" aria-hidden="true" />{s}</li>)}</ul></div>
      </div>
      <h3 className="h6 mt-3">Recommended Practice</h3>
      <div className="d-flex flex-wrap gap-2">
        {report.recommended.map((c) => <Link key={c} className="btn btn-outline-brand" href={`/interview/live?type=${CATEGORY_TYPE[c]}`}>Practice {INTERVIEW_TYPES[CATEGORY_TYPE[c]].label.replace(" Interview", "")} Questions</Link>)}
        <Link className="btn btn-brand" href={`/interview/live${retryType ? `?type=${retryType}` : ""}`}>Try Again</Link>
      </div>
    </div>
  );
}
