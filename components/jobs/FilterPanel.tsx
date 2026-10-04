import Link from "next/link";
import { ARRANGEMENT_LABEL, EMPLOYMENT_LABEL, LEVEL_LABEL } from "@/lib/labels";
import type { JobFilters } from "@/repositories/job.repository";
import type { JobSort } from "@/lib/job-search";
import { FiltersDrawer } from "./FiltersDrawer";

const SALARY_STEPS = [20000, 30000, 50000, 80000];

function Select({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: [string, string][];
}) {
  return (
    <div className="mb-3">
      <label htmlFor={`f-${name}`} className="form-label small fw-semibold">
        {label}
      </label>

      <select
        id={`f-${name}`}
        name={name}
        className="form-select"
        defaultValue={value ?? ""}
      >
        <option value="">Any</option>

        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FilterPanel({
  filters,
  sort,
  activeCount,
}: {
  filters: JobFilters;
  sort: JobSort;
  activeCount: number;
}) {
  return (
    <FiltersDrawer activeCount={activeCount}>
      <form action="/jobs" method="get">
        {/* Keyword */}
        <div className="mb-3">
          <label htmlFor="f-keyword" className="form-label small fw-semibold">
            Keyword, title or company
          </label>

          <input
            id="f-keyword"
            name="keyword"
            type="text"
            className="form-control"
            defaultValue={filters.keyword ?? ""}
            placeholder="e.g. Frontend Developer"
          />
        </div>

        {/* Location */}
        <div className="mb-3">
          <label htmlFor="f-location" className="form-label small fw-semibold">
            Location
          </label>

          <input
            id="f-location"
            name="location"
            type="text"
            className="form-control"
            defaultValue={filters.location ?? ""}
            placeholder="e.g. Makati"
          />
        </div>

        {/* Skill */}
        <div className="mb-3">
          <label htmlFor="f-skill" className="form-label small fw-semibold">
            Skill
          </label>

          <input
            id="f-skill"
            name="skill"
            type="text"
            className="form-control"
            defaultValue={filters.skills?.join(", ") ?? ""}
            placeholder="e.g. React"
          />

          <div className="form-text">Separate multiple skills with commas.</div>
        </div>

        {/* Work arrangement */}
        <Select
          name="workArrangement"
          label="Work arrangement"
          value={filters.workArrangement}
          options={Object.entries(ARRANGEMENT_LABEL) as [string, string][]}
        />

        {/* Employment type */}
        <Select
          name="employmentType"
          label="Employment type"
          value={filters.employmentType}
          options={Object.entries(EMPLOYMENT_LABEL) as [string, string][]}
        />

        {/* Experience level */}
        <Select
          name="experienceLevel"
          label="Experience level"
          value={filters.experienceLevel}
          options={Object.entries(LEVEL_LABEL) as [string, string][]}
        />

        {/* Minimum salary */}
        <Select
          name="minSalary"
          label="Minimum monthly salary"
          value={filters.minSalary?.toString()}
          options={SALARY_STEPS.map((salary): [string, string] => [
            String(salary),
            `₱${salary.toLocaleString("en-US")}+`,
          ])}
        />

        {/* Sort */}
        <Select
          name="sort"
          label="Sort by"
          value={sort}
          options={[
            ["recent", "Most recent"],
            ["salary", "Highest salary"],
            ["relevance", "Relevance"],
          ]}
        />

        {/* Actions */}
        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-brand flex-grow-1">
            Apply filters
          </button>

          {activeCount > 0 && (
            <Link href="/jobs" className="btn btn-outline-secondary">
              Clear
            </Link>
          )}
        </div>
      </form>
    </FiltersDrawer>
  );
}
