import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { jobMatchesAlert } from "@/lib/job-alerts";
import { buildJobSearchParams, parseJobSearch } from "@/lib/job-search";
import { labelFor, scoreJob, type JobCandidate, type JobSignals } from "@/lib/recommendations/jobs";
import { buildJobWhere } from "@/repositories/job.repository";
import { decodeCursor, encodeCursor } from "@/services/job.service";
import { formatSalaryCompact } from "@/lib/labels";

const job: JobSignals = {
  title: "React Developer", location: "Remote (Philippines)", workArrangement: "REMOTE", employmentType: "FULL_TIME", experienceLevel: "JUNIOR",
  salaryMin: 60000, salaryMax: 85000, skills: [{ name: "React", required: true }, { name: "TypeScript", required: true }, { name: "Testing", required: false }],
};
const empty: JobCandidate = { skills: [], targetRoles: [], years: 0, location: "", preferredLocations: [], arrangement: null, salaryMin: null, salaryMax: null, interactionSkills: [], interactionEmploymentTypes: [] };

describe("job search URL state", () => {
  it("parses the spec's example URL", () => {
    const { filters, sort } = parseJobSearch({ keyword: "react", location: "philippines", skill: "typescript", workArrangement: "remote", employmentType: "full-time", experienceLevel: "junior", minSalary: "50000", sort: "relevance" });
    assert.deepEqual(filters, { keyword: "react", location: "philippines", skills: ["typescript"], workArrangement: "REMOTE", employmentType: "FULL_TIME", experienceLevel: "JUNIOR", minSalary: 50000 });
    assert.equal(sort, "relevance");
  });
  it("supports multiple skills, legacy parameters and ignores garbage", () => {
    const r = parseJobSearch({ skill: ["React", "SQL"], q: "dev", arrangement: "HYBRID", workArrangement: "nonsense", minSalary: "-5", sort: "recent" });
    assert.deepEqual(r.filters.skills, ["React", "SQL"]);
    assert.equal(r.filters.keyword, "dev");
    assert.equal(r.filters.workArrangement, undefined);
    assert.equal(r.filters.minSalary, undefined);
    assert.equal(r.sort, "newest");
  });
  it("round-trips through the query string", () => {
    const { filters, sort } = parseJobSearch({ keyword: "react", skill: ["a", "b"], workArrangement: "on-site", minSalary: "30000", sort: "salary_desc" });
    const again = parseJobSearch(Object.fromEntries([...buildJobSearchParams(filters, sort)].map(([k, v]) => [k, v])));
    assert.equal(again.filters.workArrangement, "ONSITE");
    assert.equal(again.filters.minSalary, 30000);
    assert.equal(again.sort, "salary_desc");
  });
  it("defaults to relevance with a keyword and newest without", () => {
    assert.equal(parseJobSearch({ keyword: "x" }).sort, "relevance");
    assert.equal(parseJobSearch({}).sort, "newest");
  });
});

describe("job query building", () => {
  it("always restricts to active jobs and applies every filter on the server", () => {
    const where = buildJobWhere({ keyword: "react dev", location: "Remote", skills: ["React"], workArrangement: "REMOTE", employmentType: "FULL_TIME", experienceLevel: "JUNIOR", minSalary: 50000 });
    const and = (where as { AND: unknown[] }).AND;
    assert.deepEqual(and[0], { isActive: true });
    assert.equal(and.length, 1 + 2 + 1 + 1 + 1 + 1 + 1 + 1); // active + 2 keyword words + location + skills + 3 enums + salary
  });
  it("adds nothing but isActive for an empty search", () => assert.deepEqual(buildJobWhere({}), { AND: [{ isActive: true }] }));
});

describe("cursors", () => {
  it("round-trips and falls back to the first page on bad input", () => {
    assert.equal(decodeCursor(encodeCursor(30)), 30);
    assert.equal(decodeCursor("not-base64!!"), 0);
    assert.equal(decodeCursor(Buffer.from("-4").toString("base64url")), 0);
    assert.equal(decodeCursor(undefined), 0);
  });
});

describe("job recommendation scoring", () => {
  const strong: JobCandidate = { ...empty, skills: ["React", "TypeScript"], targetRoles: ["React Developer"], years: 2, location: "Manila", arrangement: "REMOTE", salaryMin: 50000, salaryMax: 70000 };
  it("scores a well-matched candidate higher than a poor one", () => {
    const good = scoreJob(job, strong);
    const poor = scoreJob(job, { ...empty, skills: ["COBOL"], targetRoles: ["Nurse"], arrangement: "ONSITE", salaryMin: 200000, salaryMax: 250000 });
    assert.ok(good.score > poor.score, `${good.score} > ${poor.score}`);
    assert.ok(good.score >= 80);
  });
  it("gives explainable reasons that come only from real overlapping data", () => {
    const { reasons } = scoreJob(job, strong);
    assert.ok(reasons.some((r) => r.includes("React") && r.includes("TypeScript")));
    assert.ok(reasons.includes("Matches your target role: React Developer."));
    assert.ok(reasons.includes("Matches your preferred remote work setup."));
    assert.equal(scoreJob(job, empty).reasons.length, 0); // no profile data => no invented reasons
  });
  it("is neutral (not inflated) when the user has no data", () => {
    const r = scoreJob({ ...job, workArrangement: "ONSITE", experienceLevel: "SENIOR" }, empty);
    assert.ok(r.score <= 60);
  });
  it("never exceeds 0-100 and labels sensibly", () => {
    const { score } = scoreJob(job, strong);
    assert.ok(score >= 0 && score <= 100);
    assert.equal(labelFor(85), "Strong match");
    assert.equal(labelFor(65), "Good match");
    assert.equal(labelFor(30), "Recommended for you");
  });
  it("skips the salary factor when either side has no figures", () => {
    assert.equal(scoreJob({ ...job, salaryMin: null, salaryMax: null }, strong).factors.salary, null);
    assert.equal(scoreJob(job, { ...strong, salaryMin: null, salaryMax: null }).factors.salary, null);
  });
  it("learns similarity from saved and applied jobs", () => {
    const r = scoreJob(job, { ...empty, interactionSkills: ["React", "TypeScript", "Testing"], interactionEmploymentTypes: ["FULL_TIME"] });
    assert.ok(r.reasons.includes("Similar to jobs you saved or applied to."));
  });
});

describe("job alerts", () => {
  const alertable = { title: "React Developer", company: "Bayanihan Pay", description: "Build UI", location: "Remote (Philippines)", currency: "PHP", workArrangement: "REMOTE" as const, employmentType: "FULL_TIME" as const, experienceLevel: "JUNIOR" as const, salaryMin: 60000, salaryMax: 85000, skills: ["React", "TypeScript"] };
  it("matches when every set criterion matches", () => assert.equal(jobMatchesAlert(alertable, { keyword: "react", skills: ["typescript"], workArrangement: "REMOTE", minSalary: 50000 }), true));
  it("rejects when any criterion fails", () => {
    assert.equal(jobMatchesAlert(alertable, { skills: [], workArrangement: "ONSITE" }), false);
    assert.equal(jobMatchesAlert(alertable, { skills: [], minSalary: 90000 }), false);
    assert.equal(jobMatchesAlert(alertable, { skills: ["Java"] }), false);
    assert.equal(jobMatchesAlert(alertable, { keyword: "react java", skills: [] }), false);
  });
});

describe("salary formatting", () => {
  it("formats compact monthly ranges", () => {
    assert.equal(formatSalaryCompact(60000, 85000), "₱60k–₱85k");
    assert.equal(formatSalaryCompact(null, null), "Salary not disclosed");
  });
});
