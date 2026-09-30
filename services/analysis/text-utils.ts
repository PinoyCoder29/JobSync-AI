import { createHash } from "node:crypto";

/**
 * Deterministic helpers. These run in plain code (no AI cost) and give the AI
 * verified facts to work from, and let us double-check what it returns.
 */

export const MAX_AI_CHARS = 24_000;

export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function hashText(...parts: string[]): string {
  const h = createHash("sha256");
  for (const p of parts) h.update(p).update("\u0000");
  return h.digest("hex").slice(0, 40);
}

export function truncateForAI(text: string): { text: string; truncated: boolean } {
  return text.length <= MAX_AI_CHARS ? { text, truncated: false } : { text: text.slice(0, MAX_AI_CHARS), truncated: true };
}

// ───────── skills dictionary (canonical name -> aliases) ─────────
const SKILLS: Record<string, string[]> = {
  JavaScript: ["javascript", "js", "es6", "ecmascript"], TypeScript: ["typescript", "ts"], Python: ["python"], Java: ["java"],
  "C#": ["c#", "csharp"], "C++": ["c++"], PHP: ["php"], Go: ["golang"], Ruby: ["ruby"], Kotlin: ["kotlin"], Swift: ["swift"], SQL: ["sql"],
  HTML: ["html", "html5"], CSS: ["css", "css3"], Sass: ["sass", "scss"], Bootstrap: ["bootstrap"], "Tailwind CSS": ["tailwind", "tailwindcss"],
  React: ["react", "reactjs", "react.js"], "Next.js": ["next.js", "nextjs", "next js"], "Vue.js": ["vue", "vuejs", "vue.js"], Angular: ["angular", "angularjs"],
  Svelte: ["svelte"], Redux: ["redux"], "Node.js": ["node.js", "nodejs", "node js", "node"], Express: ["express", "express.js", "expressjs"],
  NestJS: ["nestjs", "nest.js"], Django: ["django"], Flask: ["flask"], FastAPI: ["fastapi"], Laravel: ["laravel"], "Spring Boot": ["spring boot", "springboot", "spring"],
  ".NET": [".net", "dotnet", "asp.net"], GraphQL: ["graphql"], "REST API": ["rest api", "rest apis", "restful", "rest"], 
  PostgreSQL: ["postgresql", "postgres"], MySQL: ["mysql"], MongoDB: ["mongodb", "mongo"], Redis: ["redis"], SQLite: ["sqlite"], Prisma: ["prisma"], 
  Docker: ["docker"], Kubernetes: ["kubernetes", "k8s"], AWS: ["aws", "amazon web services"], Azure: ["azure"], "Google Cloud": ["gcp", "google cloud"],
  "CI/CD": ["ci/cd", "cicd", "continuous integration", "continuous delivery", "github actions", "jenkins"], Git: ["git", "github", "gitlab"],
  Linux: ["linux"], Testing: ["testing", "unit testing", "unit tests", "test automation", "qa"], Jest: ["jest"], Playwright: ["playwright"], Cypress: ["cypress"],
  Selenium: ["selenium"], Figma: ["figma"], Agile: ["agile", "scrum", "kanban"], Accessibility: ["accessibility", "wcag", "a11y"],
  "Machine Learning": ["machine learning", "ml"], "Data Analysis": ["data analysis", "pandas", "data analytics"], "Power BI": ["power bi"], Excel: ["excel"],
};

const ALIAS_TO_CANON = new Map<string, string>();
for (const [canon, aliases] of Object.entries(SKILLS)) {
  ALIAS_TO_CANON.set(canon.toLowerCase(), canon);
  aliases.forEach((a) => ALIAS_TO_CANON.set(a.toLowerCase(), canon));
}

export function canonicalTerm(term: string): string {
  const t = term.trim().toLowerCase();
  return ALIAS_TO_CANON.get(t) ?? term.trim();
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** True if `term` (or a known alias of it) appears as a whole word/phrase in `text`. */
export function hasTerm(text: string, term: string): boolean {
  const lower = text.toLowerCase();
  const canon = canonicalTerm(term);
  const variants = new Set<string>([term.toLowerCase(), canon.toLowerCase()]);
  for (const [alias, c] of ALIAS_TO_CANON) if (c === canon) variants.add(alias);
  // very short aliases ("js", "ts", "go", "ml", "qa") cause false hits, so they only count when written exactly as such
  return [...variants].some((v) => {
    if (v.length <= 2 && v !== term.toLowerCase()) return false;
    return new RegExp(`(^|[^a-z0-9+#.])${escapeRe(v)}($|[^a-z0-9+#])`, "i").test(lower);
  });
}

export function findKnownSkills(text: string): string[] {
  return Object.keys(SKILLS).filter((canon) => hasTerm(text, canon));
}

export function dedupeTerms(terms: string[]): string[] {
  const seen = new Map<string, string>();
  for (const t of terms) {
    const clean = t.trim();
    if (!clean) continue;
    const key = canonicalTerm(clean).toLowerCase();
    if (!seen.has(key)) seen.set(key, clean);
  }
  return [...seen.values()];
}

// ───────── structure detection ─────────
const SECTION_PATTERNS: [string, RegExp][] = [
  ["Summary", /^(professional\s+)?(summary|profile|objective|about me|career objective)$/i],
  ["Experience", /^(work\s+|professional\s+|employment\s+)?(experience|history)$|^work history$/i],
  ["Internship", /^internships?$/i],
  ["Education", /^(education|educational background|academic background)$/i],
  ["Skills", /^(technical\s+)?skills?( & tools| and tools)?$|^core competencies$/i],
  ["Projects", /^(personal\s+|academic\s+)?projects?$/i],
  ["Certifications", /^(certifications?|licenses?( & certifications?)?|licenses and certifications)$/i],
  ["Training", /^(trainings?|seminars?( & trainings?)?|courses)$/i],
];

export function detectSections(text: string): string[] {
  const found = new Set<string>();
  for (const line of text.split("\n")) {
    const t = line.trim().replace(/[:\-–—_*#]+$/g, "").trim();
    if (!t || t.length > 40) continue;
    for (const [name, re] of SECTION_PATTERNS) if (re.test(t)) found.add(name);
  }
  return [...found];
}

export function detectContact(text: string) {
  return {
    email: /[\w.+-]+@[\w-]+\.[\w.-]+/.test(text),
    phone: /(\+?\d[\d\s().-]{7,}\d)/.test(text),
    linkedin: /linkedin\.com\/in\//i.test(text),
    github: /github\.com\/[\w-]+/i.test(text),
    portfolio: /https?:\/\/(?!(www\.)?(linkedin|github)\.com)[\w.-]+\.[a-z]{2,}/i.test(text),
  };
}

export function structureFacts(raw: string, normalized: string) {
  const lines = raw.split("\n").filter((l) => l.trim());
  const spaced = lines.filter((l) => /\t|\s{4,}/.test(l)).length;
  const piped = lines.filter((l) => (l.match(/\|/g) ?? []).length >= 2).length;
  const symbols = (raw.match(/[●■◆►★☎✉✔✓❖▪◦♦]/g) ?? []).length;
  const styles = new Set<string>();
  if (/\b\d{1,2}\/\d{4}\b/.test(normalized)) styles.add("MM/YYYY");
  if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}\b/i.test(normalized)) styles.add("Month YYYY");
  if (/\b\d{4}-\d{2}\b/.test(normalized)) styles.add("YYYY-MM");
  const letters = (normalized.match(/[A-Za-z]/g) ?? []).length;
  return {
    characters: normalized.length,
    words: normalized.split(/\s+/).filter(Boolean).length,
    possibleColumnsOrTables: lines.length > 8 && (spaced + piped) / lines.length > 0.2,
    unusualSymbols: symbols,
    dateFormats: [...styles],
    inconsistentDates: styles.size > 1,
    lowTextQuality: normalized.length > 0 && letters / normalized.length < 0.5,
  };
}

export function buildFacts(raw: string, normalized: string) {
  return {
    sectionsDetected: detectSections(normalized),
    contactDetected: detectContact(normalized),
    knownSkillsInResume: findKnownSkills(normalized),
    structure: structureFacts(raw, normalized),
  };
}
export type ResumeFacts = ReturnType<typeof buildFacts>;
