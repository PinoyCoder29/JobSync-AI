"use client";

import { useId, useState, useTransition } from "react";
import { saveResumeAction } from "@/app/actions/resume.actions";
import type { ResumeInput } from "@/lib/validations/resume";
import type { ActionState } from "@/types";
import { ResumePreview } from "./ResumePreview";

type Exp = ResumeInput["experiences"][number];
type Edu = ResumeInput["education"][number];
type Proj = ResumeInput["projects"][number];
type Cert = ResumeInput["certifications"][number];

const blankExp: Exp = { company: "", role: "", location: "", startDate: "", endDate: "", description: "" };
const blankEdu: Edu = { school: "", degree: "", field: "", startDate: "", endDate: "", description: "" };
const blankProj: Proj = { name: "", url: "", description: "", technologies: "" };
const blankCert: Cert = { name: "", issuer: "", issuedDate: "", url: "" };

function Field({ label, value, onChange, area, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; area?: boolean; type?: string; placeholder?: string }) {
  const id = useId();
  return (
    <div className="mb-2">
      <label htmlFor={id} className="form-label small fw-semibold mb-1">{label}</label>
      {area ? (
        <textarea id={id} className="form-control" rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input id={id} type={type} className="form-control" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}

function Repeater<T>({ title, hint, items, onChange, blank, addLabel, itemLabel, render }: {
  title: string; hint?: string; items: T[]; onChange: (items: T[]) => void; blank: T; addLabel: string;
  itemLabel: (item: T, i: number) => string; render: (item: T, patch: (p: Partial<T>) => void) => React.ReactNode;
}) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const copy = [...items];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  };
  return (
    <section className="editor-section">
      <h3 className="sub-title">{title}</h3>
      {hint && <p className="text-muted small">{hint}</p>}
      {items.length === 0 && <p className="text-muted small fst-italic">Nothing added yet.</p>}
      {items.map((item, i) => (
        <div key={i} className="editor-item">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <strong className="small">{itemLabel(item, i)}</strong>
            <div className="btn-group btn-group-sm" role="group" aria-label={`Actions for ${title} ${i + 1}`}>
              <button type="button" className="btn btn-outline-secondary" onClick={() => move(i, -1)} disabled={i === 0}>Up</button>
              <button type="button" className="btn btn-outline-secondary" onClick={() => move(i, 1)} disabled={i === items.length - 1}>Down</button>
              <button type="button" className="btn btn-outline-danger" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>Remove</button>
            </div>
          </div>
          {render(item, (p) => onChange(items.map((x, idx) => (idx === i ? { ...x, ...p } : x))))}
        </div>
      ))}
      <button type="button" className="btn btn-outline-brand btn-sm" onClick={() => onChange([...items, { ...blank }])}>+ {addLabel}</button>
    </section>
  );
}

export function ResumeEditor({ initial }: { initial: ResumeInput }) {
  const [data, setData] = useState<ResumeInput>(initial);
  const [skillsText, setSkillsText] = useState(initial.skills.join(", "));
  const [result, setResult] = useState<ActionState | null>(null);
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  const set = <K extends keyof ResumeInput>(key: K, value: ResumeInput[K]) => setData((d) => ({ ...d, [key]: value }));

  const save = () =>
    start(async () => {
      setResult(null);
      setResult(await saveResumeAction(data));
    });

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div className="btn-group d-lg-none" role="group" aria-label="Editor or preview">
          <button type="button" className={`btn btn-sm ${tab === "edit" ? "btn-brand" : "btn-outline-brand"}`} onClick={() => setTab("edit")}>Edit</button>
          <button type="button" className={`btn btn-sm ${tab === "preview" ? "btn-brand" : "btn-outline-brand"}`} onClick={() => setTab("preview")}>Preview</button>
        </div>
        <div className="d-flex align-items-center gap-3 ms-auto">
          {result && <span role={result.ok ? "status" : "alert"} className={result.ok ? "text-success small" : "text-danger small"}>{result.message}</span>}
          <button type="button" className="btn btn-brand" onClick={save} disabled={pending} aria-busy={pending}>
            {pending ? "Saving…" : "Save resume"}
          </button>
        </div>
      </div>

      <div className="row g-4">
        <div className={`col-lg-6 ${tab === "preview" ? "d-none d-lg-block" : ""}`}>
          <section className="editor-section">
            <h3 className="sub-title">Personal information</h3>
            <div className="row">
              <div className="col-sm-6"><Field label="Full name" value={data.fullName} onChange={(v) => set("fullName", v)} /></div>
              <div className="col-sm-6"><Field label="Email" type="email" value={data.email} onChange={(v) => set("email", v)} /></div>
              <div className="col-sm-6"><Field label="Phone" value={data.phone} onChange={(v) => set("phone", v)} /></div>
              <div className="col-sm-6"><Field label="Location" value={data.location} onChange={(v) => set("location", v)} /></div>
            </div>
            <Field label="Headline" value={data.headline} onChange={(v) => set("headline", v)} placeholder="e.g. Junior Full Stack Developer" />
            <Field label="Professional summary" area value={data.summary} onChange={(v) => set("summary", v)} placeholder="2–3 sentences: target role, strongest skills, one achievement." />
          </section>

          <Repeater<Exp> title="Experience" items={data.experiences} onChange={(v) => set("experiences", v)} blank={blankExp} addLabel="Add experience"
            itemLabel={(e, i) => e.role || `Experience ${i + 1}`}
            render={(e, p) => (<>
              <div className="row">
                <div className="col-sm-6"><Field label="Role" value={e.role} onChange={(v) => p({ role: v })} /></div>
                <div className="col-sm-6"><Field label="Company" value={e.company} onChange={(v) => p({ company: v })} /></div>
                <div className="col-sm-4"><Field label="Location" value={e.location} onChange={(v) => p({ location: v })} /></div>
                <div className="col-sm-4"><Field label="Start (YYYY-MM)" value={e.startDate} onChange={(v) => p({ startDate: v })} placeholder="2024-01" /></div>
                <div className="col-sm-4"><Field label="End (blank = present)" value={e.endDate} onChange={(v) => p({ endDate: v })} placeholder="2025-03" /></div>
              </div>
              <Field label="What you did and achieved" area value={e.description} onChange={(v) => p({ description: v })} />
            </>)} />

          <Repeater<Edu> title="Education" items={data.education} onChange={(v) => set("education", v)} blank={blankEdu} addLabel="Add education"
            itemLabel={(e, i) => e.school || `Education ${i + 1}`}
            render={(e, p) => (<>
              <div className="row">
                <div className="col-sm-6"><Field label="School" value={e.school} onChange={(v) => p({ school: v })} /></div>
                <div className="col-sm-6"><Field label="Degree" value={e.degree} onChange={(v) => p({ degree: v })} /></div>
                <div className="col-sm-4"><Field label="Field of study" value={e.field} onChange={(v) => p({ field: v })} /></div>
                <div className="col-sm-4"><Field label="Start" value={e.startDate} onChange={(v) => p({ startDate: v })} placeholder="2020" /></div>
                <div className="col-sm-4"><Field label="End" value={e.endDate} onChange={(v) => p({ endDate: v })} placeholder="2024" /></div>
              </div>
            </>)} />

          <section className="editor-section">
            <h3 className="sub-title">Skills</h3>
            <Field label="Skills (comma separated)" value={skillsText} onChange={(v) => { setSkillsText(v); set("skills", v.split(",").map((s) => s.trim()).filter(Boolean)); }} placeholder="React, Next.js, TypeScript, PostgreSQL" />
          </section>

          <Repeater<Proj> title="Projects" items={data.projects} onChange={(v) => set("projects", v)} blank={blankProj} addLabel="Add project"
            itemLabel={(p, i) => p.name || `Project ${i + 1}`}
            render={(pr, p) => (<>
              <div className="row">
                <div className="col-sm-6"><Field label="Name" value={pr.name} onChange={(v) => p({ name: v })} /></div>
                <div className="col-sm-6"><Field label="Link" type="url" value={pr.url} onChange={(v) => p({ url: v })} placeholder="https://" /></div>
              </div>
              <Field label="Technologies" value={pr.technologies} onChange={(v) => p({ technologies: v })} />
              <Field label="Description" area value={pr.description} onChange={(v) => p({ description: v })} />
            </>)} />

          <Repeater<Cert> title="Certifications" items={data.certifications} onChange={(v) => set("certifications", v)} blank={blankCert} addLabel="Add certification"
            itemLabel={(c, i) => c.name || `Certification ${i + 1}`}
            render={(c, p) => (
              <div className="row">
                <div className="col-sm-6"><Field label="Name" value={c.name} onChange={(v) => p({ name: v })} /></div>
                <div className="col-sm-6"><Field label="Issuer" value={c.issuer} onChange={(v) => p({ issuer: v })} /></div>
                <div className="col-sm-6"><Field label="Date" value={c.issuedDate} onChange={(v) => p({ issuedDate: v })} placeholder="2024-05" /></div>
                <div className="col-sm-6"><Field label="Credential link" type="url" value={c.url} onChange={(v) => p({ url: v })} placeholder="https://" /></div>
              </div>
            )} />
        </div>

        <div className={`col-lg-6 ${tab === "edit" ? "d-none d-lg-block" : ""}`}>
          <div className="preview-sticky"><ResumePreview data={data} /></div>
        </div>
      </div>
    </div>
  );
}
