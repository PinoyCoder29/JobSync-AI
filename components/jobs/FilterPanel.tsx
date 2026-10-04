import Link from "next/link";
import { ARRANGEMENT_LABEL, EMPLOYMENT_LABEL, LEVEL_LABEL } from "@/lib/labels";
import type { JobFilters } from "@/repositories/job.repository";
import type { JobSort } from "@/lib/job-search";
import { FiltersDrawer } from "./FiltersDrawer";

const SALARY_STEPS = [20000, 30000, 50000, 80000];

function Select({ name, label, value, options }: { name: string; label: string; value?: string; options: [string, string][] }) {
  return (
    <div className="mb-3">
      <label htmlFor={`f-${name}`} className="form-label small fw-semibold">{label}</label>
      <select id={`f-${name}`} name={name} className="form-select" defaultValue={value ?? ""}>
        <option value="">Any</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

export function FilterPanel({ filters, sort, activeCount }: { filters: JobFilters; sort: JobSort; activeCount: number }) {
  return (
    <FiltersDrawer activeCount={activeCount}>
      <form action="/jobs" method="get">
        <div className="mb-3">
          <label htmlFor="f-q" className="form-label small fw-semibold">Keyword, title or company</label>
          <input id="f-q" name="q" className="form-control" defaultValue={filters.q ?? ""} placeholder="e.g. Frontend Developer" />
        </div>
        <div className="mb-3">
          <label htmlFor="f-location" className="form-label small fw-semibold">Location</label>
          <input id="f-location" name="location" className="form-control" defaultValue={filters.location ?? ""} placeholder="e.g. Makati" />
        </div>
        <div className="mb-3">
          <label htmlFor="f-skill" className="form-label small fw-semibold">Skill</label>
          <input id="f-skill" name="skill" className="form-control" defaultValue={filters.skill ?? ""} placeholder="e.g. React" />
        </div>
        <Select name="arrangement" label="Work arrangement" value={filters.arrangement} options={Object.entries(ARRANGEMENT_LABEL)} />
        <Select name="type" label="Employment type" value={filters.type} options={Object.entries(EMPLOYMENT_LABEL)} />
        <Select name="level" label="Experience level" value={filters.level} options={Object.entries(LEVEL_LABEL)} />
        <Select name="minSalary" label="Minimum monthly salary" value={filters.minSalary?.toString()} options={SALARY_STEPS.map((n): [string, string] => [String(n), `₱${n.toLocaleString("en-US")}+`])} />
        <Select name="sort" label="Sort by" value={sort} options={[["recent", "Most recent"], ["salary", "Highest salary"], ["relevance", "Relevance"]]} />
        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-brand flex-grow-1">Apply filters</button>
          {activeCount > 0 && <Link href="/jobs" className="btn btn-outline-secondary">Clear</Link>}
        </div>
      </form>
    </FiltersDrawer>
  );
}
