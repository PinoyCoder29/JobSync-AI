"use client";

import { useEffect, useId, useState } from "react";

export type FilterState = {
  keyword: string; location: string; skills: string[];
  workArrangement: string; employmentType: string; experienceLevel: string; minSalary: string; sort: string;
};

export const EMPTY_FILTERS: FilterState = { keyword: "", location: "", skills: [], workArrangement: "", employmentType: "", experienceLevel: "", minSalary: "", sort: "" };

/** URL query -> form state (friendly values, same as the shared URLs). */
export function filtersFromQuery(query: string): FilterState {
  const p = new URLSearchParams(query);
  const skills = p.getAll("skill").flatMap((s) => s.split(",")).map((s) => s.trim()).filter(Boolean);
  return {
    keyword: p.get("keyword") ?? p.get("q") ?? "", location: p.get("location") ?? "", skills,
    workArrangement: p.get("workArrangement") ?? "", employmentType: p.get("employmentType") ?? "", experienceLevel: p.get("experienceLevel") ?? "",
    minSalary: p.get("minSalary") ?? "", sort: p.get("sort") ?? "",
  };
}

export function filtersToQuery(f: FilterState): string {
  const p = new URLSearchParams();
  if (f.keyword.trim()) p.set("keyword", f.keyword.trim());
  if (f.location.trim()) p.set("location", f.location.trim());
  f.skills.forEach((s) => p.append("skill", s));
  if (f.workArrangement) p.set("workArrangement", f.workArrangement);
  if (f.employmentType) p.set("employmentType", f.employmentType);
  if (f.experienceLevel) p.set("experienceLevel", f.experienceLevel);
  if (f.minSalary) p.set("minSalary", f.minSalary);
  if (f.sort) p.set("sort", f.sort);
  return p.toString();
}

const ARRANGEMENTS = [["", "Any"], ["on-site", "On-site"], ["hybrid", "Hybrid"], ["remote", "Remote"]];
const TYPES = [["", "Any"], ["full-time", "Full-time"], ["part-time", "Part-time"], ["contract", "Contract"], ["internship", "Internship"]];
const LEVELS = [["", "Any"], ["entry", "Entry level"], ["junior", "Junior"], ["mid", "Mid level"], ["senior", "Senior"]];
const SALARIES = [["", "Any"], ["20000", "₱20,000+"], ["30000", "₱30,000+"], ["50000", "₱50,000+"], ["80000", "₱80,000+"]];
// Location suggestions only: the field accepts any text, so other countries/cities work without code changes.
const LOCATION_HINTS = ["Philippines", "Remote", "Manila", "Quezon City", "Makati", "Taguig", "Pasig", "Cebu", "Davao"];

function Select({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: string[][]; onChange: (v: string) => void }) {
  return (
    <div className="filter-field">
      <label htmlFor={id} className="form-label small mb-1">{label}</label>
      <select id={id} className="form-select form-select-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

export function JobFilters({ value, onSubmit, signedIn, busy }: { value: FilterState; onSubmit: (f: FilterState) => void; signedIn: boolean; busy?: boolean }) {
  const uid = useId();
  const [f, setF] = useState<FilterState>(value);
  const [skillInput, setSkillInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const set = <K extends keyof FilterState>(k: K, v: FilterState[K]) => setF((p) => ({ ...p, [k]: v }));
  const apply = (next: FilterState) => onSubmit(next);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/skills?q=${encodeURIComponent(skillInput.trim())}`);
        const json = await res.json();
        setSuggestions(json.success ? (json.data as string[]) : []);
      } catch { setSuggestions([]); }
    }, 200);
    return () => clearTimeout(t);
  }, [skillInput]);

  const addSkill = (name: string) => {
    const s = name.trim();
    if (!s || f.skills.some((x) => x.toLowerCase() === s.toLowerCase()) || f.skills.length >= 8) return;
    const next = { ...f, skills: [...f.skills, s] };
    setF(next); setSkillInput(""); apply(next);
  };
  const dropSkill = (name: string) => { const next = { ...f, skills: f.skills.filter((s) => s !== name) }; setF(next); apply(next); };
  const pick = <K extends keyof FilterState>(k: K, v: FilterState[K]) => { const next = { ...f, [k]: v }; setF(next); apply(next); };
  const active = Boolean(f.keyword || f.location || f.skills.length || f.workArrangement || f.employmentType || f.experienceLevel || f.minSalary);

  return (
    <form className="jobs-filters" role="search" aria-label="Find jobs" onSubmit={(e) => { e.preventDefault(); apply(f); }}>
      <div className="jobs-search-row">
        <div className="filter-field flex-grow-1">
          <label htmlFor={`${uid}-kw`} className="visually-hidden">Keyword, title or company</label>
          <input id={`${uid}-kw`} type="search" className="form-control" placeholder="Keyword, title or company" value={f.keyword} onChange={(e) => set("keyword", e.target.value)} maxLength={100} />
        </div>
        <div className="filter-field flex-grow-1">
          <label htmlFor={`${uid}-loc`} className="visually-hidden">Location</label>
          <input id={`${uid}-loc`} list={`${uid}-locs`} className="form-control" placeholder="Location" value={f.location} onChange={(e) => set("location", e.target.value)} maxLength={100} />
          <datalist id={`${uid}-locs`}>{LOCATION_HINTS.map((l) => <option key={l} value={l} />)}</datalist>
        </div>
        <button type="submit" className="btn btn-brand" disabled={busy}><i className="bi bi-search me-1" aria-hidden="true" />Search</button>
        <button type="button" className="btn btn-outline-brand d-md-none" aria-expanded={open} aria-controls={`${uid}-more`} onClick={() => setOpen((v) => !v)}>
          <i className="bi bi-sliders" aria-hidden="true" /> Filters
        </button>
      </div>

      <div id={`${uid}-more`} className={`jobs-filter-grid ${open ? "open" : ""}`}>
        <Select id={`${uid}-wa`} label="Work arrangement" value={f.workArrangement} options={ARRANGEMENTS} onChange={(v) => pick("workArrangement", v)} />
        <Select id={`${uid}-et`} label="Employment type" value={f.employmentType} options={TYPES} onChange={(v) => pick("employmentType", v)} />
        <Select id={`${uid}-el`} label="Experience level" value={f.experienceLevel} options={LEVELS} onChange={(v) => pick("experienceLevel", v)} />
        <Select id={`${uid}-ms`} label="Minimum monthly salary" value={f.minSalary} options={SALARIES} onChange={(v) => pick("minSalary", v)} />
        <Select id={`${uid}-sort`} label="Sort by" value={f.sort || "relevance"} onChange={(v) => pick("sort", v)}
          options={[["relevance", "Relevance"], ["newest", "Newest"], ["salary_desc", "Salary: High to Low"], ["salary_asc", "Salary: Low to High"], ...(signedIn ? [["best_match", "Best Match"]] : [])]} />

        <div className="filter-field filter-skills">
          <label htmlFor={`${uid}-skill`} className="form-label small mb-1">Skills</label>
          <div className="skill-input">
            {f.skills.map((s) => (
              <span key={s} className="skill-chip">{s}<button type="button" aria-label={`Remove ${s}`} onClick={() => dropSkill(s)}><i className="bi bi-x" aria-hidden="true" /></button></span>
            ))}
            <input id={`${uid}-skill`} list={`${uid}-skills`} className="form-control form-control-sm" placeholder={f.skills.length ? "Add another…" : "React, TypeScript, SQL…"} value={skillInput}
              onChange={(e) => { const v = e.target.value; setSkillInput(v); if (suggestions.some((s) => s.toLowerCase() === v.toLowerCase())) addSkill(v); }}
              onKeyDown={(e) => { if (e.key === "Enter" && skillInput.trim()) { e.preventDefault(); addSkill(skillInput); } }} />
            <datalist id={`${uid}-skills`}>{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
          </div>
        </div>
        {active && <button type="button" className="btn btn-link btn-sm align-self-end" onClick={() => { setF(EMPTY_FILTERS); apply(EMPTY_FILTERS); }}>Clear all</button>}
      </div>
    </form>
  );
}
