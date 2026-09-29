import { PrismaClient, type ApplicationStatus, type EmploymentType, type ExperienceLevel, type WorkArrangement } from "@prisma/client";
import bcrypt from "bcryptjs";
import { MockAIProvider } from "../services/ai/mock-ai-provider";
import { QUESTION_BANK } from "../services/ai/question-bank";

const prisma = new PrismaClient();
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

export const DEMO_PASSWORD = "JobSync!2025";

type SeedJob = {
  key: string; title: string; company: string; about: string; location: string; arr: WorkArrangement; type: EmploymentType;
  level: ExperienceLevel; min: number; max: number; posted: number; description: string;
  responsibilities: string[]; requirements: string[]; preferred: string[]; benefits: string[];
  required: string[]; nice: string[];
};

const STD_BENEFITS = ["HMO from day one", "13th month pay", "Paid leaves", "Learning budget for courses and certifications"];

const JOBS: SeedJob[] = [
  { key: "kapitan-fullstack-jr", title: "Junior Full Stack Developer", company: "Kapitan Labs", about: "Kapitan Labs builds booking and scheduling software for clinics and salons across Metro Manila.", location: "Makati", arr: "HYBRID", type: "FULL_TIME", level: "JUNIOR", min: 30000, max: 40000, posted: 2,
    description: "Join a small product team building customer-facing features end to end. You will ship React and Next.js interfaces backed by PostgreSQL, with guidance from senior engineers and code reviews on every pull request.",
    responsibilities: ["Build and maintain features in Next.js and TypeScript", "Design database tables and write queries in PostgreSQL", "Consume and document REST API endpoints", "Fix bugs reported by support and QA"],
    requirements: ["Portfolio or projects using React or Next.js", "Working knowledge of TypeScript and SQL", "Comfortable using Git and pull requests", "Clear written communication in English"],
    preferred: ["Basic Docker experience", "Familiarity with Prisma or another ORM"], benefits: [...STD_BENEFITS, "Hybrid schedule: 3 days on-site"],
    required: ["React", "Next.js", "TypeScript", "PostgreSQL", "REST API", "Git"], nice: ["Docker"] },
  { key: "luntian-frontend", title: "Frontend Developer", company: "Luntian Commerce", about: "Luntian Commerce runs an online marketplace for local farms and food producers.", location: "Taguig", arr: "HYBRID", type: "FULL_TIME", level: "MID", min: 45000, max: 65000, posted: 4,
    description: "Own the storefront experience for thousands of daily shoppers. You will turn designs into fast, accessible React interfaces and improve Core Web Vitals across the marketplace.",
    responsibilities: ["Build reusable React components with TypeScript", "Improve page speed and accessibility", "Write unit and integration tests", "Work with designers on new checkout flows"],
    requirements: ["2+ years building production React apps", "Strong HTML, CSS and JavaScript fundamentals", "Experience writing tests for UI code", "Knowledge of web accessibility basics"],
    preferred: ["Experience with Next.js", "Component library experience"], benefits: [...STD_BENEFITS, "Monthly wellness allowance"],
    required: ["React", "TypeScript", "JavaScript", "CSS", "HTML", "Testing", "Accessibility"], nice: ["Next.js"] },
  { key: "bayanihan-react", title: "React Developer", company: "Bayanihan Pay", about: "Bayanihan Pay is a remote-first fintech helping freelancers receive cross-border payments.", location: "Remote (Philippines)", arr: "REMOTE", type: "FULL_TIME", level: "MID", min: 60000, max: 85000, posted: 1,
    description: "Build the web dashboard our freelancers use to track earnings and withdrawals. Security, clarity and reliability matter more than novelty in this role.",
    responsibilities: ["Develop dashboard features in React and TypeScript", "Integrate REST APIs and handle error states well", "Review pull requests from teammates", "Participate in on-call rotation once a quarter"],
    requirements: ["3+ years with React", "Solid TypeScript skills", "Experience testing with Jest or similar", "Reliable home internet and a quiet workspace"],
    preferred: ["GraphQL experience", "Fintech or payments background"], benefits: [...STD_BENEFITS, "Internet allowance", "Remote equipment budget"],
    required: ["React", "TypeScript", "JavaScript", "REST API", "Testing", "Git"], nice: ["GraphQL"] },
  { key: "sampaguita-nextjs", title: "Next.js Developer", company: "Sampaguita Studio", about: "Sampaguita Studio is a web agency delivering marketing sites and web apps for Filipino startups.", location: "Quezon City", arr: "HYBRID", type: "FULL_TIME", level: "JUNIOR", min: 35000, max: 50000, posted: 6,
    description: "Work on client projects from kickoff to launch using Next.js, Prisma and PostgreSQL. You will pair with senior developers and present your work to clients.",
    responsibilities: ["Build pages and API routes in Next.js", "Model data with Prisma and PostgreSQL", "Implement authentication and forms", "Deploy projects and monitor them after launch"],
    requirements: ["Projects built with Next.js and React", "Basic Prisma or SQL experience", "Understanding of server and client rendering", "Willingness to learn quickly"],
    preferred: ["Experience with authentication libraries", "Git workflow experience"], benefits: [...STD_BENEFITS, "Flexible hours"],
    required: ["Next.js", "React", "TypeScript", "Prisma", "PostgreSQL"], nice: ["Git"] },
  { key: "pinnacle-swe", title: "Software Engineer", company: "Pinnacle Logistics Systems", about: "Pinnacle Logistics Systems provides fleet and warehouse software to shipping companies in the Philippines.", location: "Pasig", arr: "ONSITE", type: "FULL_TIME", level: "MID", min: 70000, max: 95000, posted: 9,
    description: "Design and build services that track thousands of shipments daily. You will work across Node.js APIs, PostgreSQL and the deployment pipeline.",
    responsibilities: ["Build and scale Node.js services", "Optimise PostgreSQL queries and indexes", "Maintain CI/CD pipelines", "Containerise services with Docker"],
    requirements: ["3+ years of backend or full stack experience", "Strong TypeScript and Node.js", "Experience with Docker and CI/CD", "Comfort debugging production issues"],
    preferred: ["AWS experience", "Experience with logistics or IoT data"], benefits: [...STD_BENEFITS, "Shuttle service", "Performance bonus"],
    required: ["TypeScript", "Node.js", "PostgreSQL", "Docker", "CI/CD"], nice: ["AWS"] },
  { key: "mabuhay-backend", title: "Backend Developer", company: "Mabuhay Health Tech", about: "Mabuhay Health Tech connects patients with clinics through telehealth and appointment tools.", location: "Remote (Philippines)", arr: "REMOTE", type: "FULL_TIME", level: "MID", min: 65000, max: 90000, posted: 3,
    description: "Build secure APIs that power our patient and clinic apps. Data privacy is central to the work, and you will help us keep it that way.",
    responsibilities: ["Design REST APIs with Node.js", "Write automated tests for critical flows", "Model relational data in PostgreSQL", "Document endpoints for frontend teams"],
    requirements: ["3+ years of backend development", "Strong SQL and data modelling", "Experience with Docker", "Understanding of authentication and authorization"],
    preferred: ["AWS experience", "CI/CD pipeline experience"], benefits: [...STD_BENEFITS, "Internet allowance"],
    required: ["Node.js", "PostgreSQL", "REST API", "Docker", "Testing"], nice: ["AWS", "CI/CD"] },
  { key: "tarsier-qa", title: "QA Automation Engineer", company: "Tarsier Software", about: "Tarsier Software builds workforce management tools used by BPO companies.", location: "Cebu City", arr: "HYBRID", type: "FULL_TIME", level: "MID", min: 40000, max: 60000, posted: 12,
    description: "Automate regression tests for a fast-moving web product. You will write end-to-end tests, run them in CI and help developers catch bugs before release.",
    responsibilities: ["Write end-to-end tests with Playwright", "Maintain the automated regression suite", "Test REST APIs and report defects", "Integrate test runs into CI"],
    requirements: ["2+ years in QA automation", "JavaScript or TypeScript scripting", "Experience testing REST APIs", "Familiarity with Git"],
    preferred: ["Experience with Playwright", "Basic SQL"], benefits: [...STD_BENEFITS, "Night differential if applicable"],
    required: ["Testing", "JavaScript", "Playwright", "REST API", "CI/CD", "Git"], nice: ["SQL"] },
  { key: "alon-ui", title: "UI Developer", company: "Alon Creative Group", about: "Alon Creative Group is a branding and digital studio serving retail and hospitality clients.", location: "Makati", arr: "ONSITE", type: "FULL_TIME", level: "ENTRY", min: 25000, max: 35000, posted: 5,
    description: "Turn design files into responsive, accessible pages. This is a good first role for a developer with a strong HTML and CSS foundation.",
    responsibilities: ["Convert Figma designs into responsive pages", "Build components with Bootstrap and custom CSS", "Add interactivity with JavaScript", "Test across browsers and devices"],
    requirements: ["Strong HTML and CSS", "Basic JavaScript", "A portfolio of responsive pages", "Attention to visual detail"],
    preferred: ["Experience with React", "Knowledge of accessibility"], benefits: [...STD_BENEFITS, "Mentorship from senior designers"],
    required: ["HTML", "CSS", "JavaScript", "Bootstrap"], nice: ["React", "Accessibility"] },
  { key: "kalikasan-intern", title: "Web Developer Intern", company: "Kalikasan Digital", about: "Kalikasan Digital creates websites and campaigns for environmental nonprofits.", location: "Manila", arr: "HYBRID", type: "INTERNSHIP", level: "ENTRY", min: 15000, max: 20000, posted: 7,
    description: "A six-month paid internship for students and fresh graduates. You will work on real nonprofit websites with a mentor and present your work at the end.",
    responsibilities: ["Update and build website pages", "Fix small bugs under mentor guidance", "Test changes on staging", "Document what you learn"],
    requirements: ["Basic HTML, CSS and JavaScript", "Student or recent graduate", "Willing to learn React", "Able to work on-site twice a week"],
    preferred: ["Personal or school web projects"], benefits: ["Monthly allowance", "Mentorship", "Certificate of completion", "Possible full-time offer"],
    required: ["HTML", "CSS", "JavaScript", "Git"], nice: ["React"] },
  { key: "dagat-fullstack", title: "Full Stack Developer", company: "Dagat Fintech", about: "Dagat Fintech offers savings and micro-investment products to first-time investors.", location: "Remote (Philippines)", arr: "REMOTE", type: "FULL_TIME", level: "MID", min: 80000, max: 110000, posted: 8,
    description: "Build features across our React web app and Node.js services. You will own features from design discussion to production monitoring.",
    responsibilities: ["Build UI in React and TypeScript", "Develop Node.js services and PostgreSQL schemas", "Deploy on AWS using Docker and CI/CD", "Improve reliability and monitoring"],
    requirements: ["3+ years full stack experience", "Strong React and Node.js", "Experience deploying to AWS", "Good judgment about security"],
    preferred: ["Fintech experience"], benefits: [...STD_BENEFITS, "Stock options", "Remote equipment budget"],
    required: ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS", "Docker", "CI/CD"], nice: [] },
  { key: "hangin-jr-swe", title: "Junior Software Engineer", company: "Hangin Analytics", about: "Hangin Analytics helps local governments visualise weather and disaster-preparedness data.", location: "Davao City", arr: "ONSITE", type: "CONTRACT", level: "JUNIOR", min: 28000, max: 38000, posted: 14,
    description: "A 12-month contract role building internal tools and data views. You will work with SQL, TypeScript and a small analytics team.",
    responsibilities: ["Build internal web tools in TypeScript", "Write SQL queries for reports", "Add automated tests", "Support analysts with data requests"],
    requirements: ["Foundation in JavaScript and TypeScript", "Basic SQL", "Comfortable with Git", "Interest in data and public service"],
    preferred: ["Experience writing tests"], benefits: ["13th month pay", "HMO", "Possible contract renewal"],
    required: ["JavaScript", "TypeScript", "SQL", "Git", "Testing"], nice: [] },
  { key: "ilaw-node", title: "Node.js Backend Developer", company: "Ilaw Insurance Tech", about: "Ilaw Insurance Tech modernises claims processing for mid-size insurers.", location: "Taguig", arr: "HYBRID", type: "FULL_TIME", level: "SENIOR", min: 100000, max: 140000, posted: 10,
    description: "Lead backend work on a claims platform. You will make architecture decisions, mentor two junior developers and keep the system reliable.",
    responsibilities: ["Design and review backend architecture", "Mentor junior developers", "Own database performance", "Run incident reviews"],
    requirements: ["5+ years of backend experience", "Deep Node.js and PostgreSQL knowledge", "Experience with AWS and CI/CD", "Track record mentoring others"],
    preferred: ["Insurance domain knowledge"], benefits: [...STD_BENEFITS, "Performance bonus", "Life insurance"],
    required: ["Node.js", "PostgreSQL", "AWS", "CI/CD", "Docker", "TypeScript"], nice: [] },
];

async function skill(name: string) {
  return prisma.skill.upsert({ where: { name }, create: { name }, update: {} });
}

async function seedJobs() {
  for (const j of JOBS) {
    const data = {
      title: j.title, company: j.company, companyDescription: j.about, location: j.location, workArrangement: j.arr, employmentType: j.type,
      experienceLevel: j.level, salaryMin: j.min, salaryMax: j.max, currency: "PHP", description: j.description,
      responsibilities: j.responsibilities, requirements: j.requirements, preferred: j.preferred, benefits: j.benefits,
      postedAt: daysAgo(j.posted), isActive: true,
    };
    const job = await prisma.job.upsert({
      where: { source_externalId: { source: "seed", externalId: j.key } },
      create: { ...data, source: "seed", externalId: j.key },
      update: data,
    });
    await prisma.jobSkill.deleteMany({ where: { jobId: job.id } });
    for (const [names, required] of [[j.required, true], [j.nice, false]] as const) {
      for (const n of names) {
        const s = await skill(n);
        await prisma.jobSkill.create({ data: { jobId: job.id, skillId: s.id, required } });
      }
    }
  }
}

async function upsertUser(name: string, email: string) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  return prisma.user.upsert({ where: { email }, create: { name, email, passwordHash, profile: { create: {} } }, update: { name, passwordHash } });
}

async function seedCamille() {
  const user = await upsertUser("Camille Reyes", "camille.reyes@jobsync.dev");
  const userId = user.id;

  await prisma.profile.upsert({
    where: { userId },
    create: { userId },
    update: {
      headline: "Aspiring Full Stack Developer | React, Next.js, PostgreSQL",
      summary: "Information technology graduate with a year of freelance and internship experience building responsive web apps. Comfortable across React, Next.js and PostgreSQL, and looking for a junior full stack role on a team that values code review and mentorship.",
      location: "Quezon City, Metro Manila", targetRoles: ["Junior Full Stack Developer", "Frontend Developer", "Next.js Developer"],
      preferredWorkArrangement: "HYBRID", preferredLocations: ["Makati", "Taguig", "Quezon City"], salaryExpectationMin: 30000, salaryExpectationMax: 42000,
      portfolioUrl: "https://camille-reyes.example.dev", githubUrl: "https://github.com/camille-reyes-dev", linkedinUrl: "https://linkedin.com/in/camille-reyes-dev",
    },
  });

  const levels: Record<string, number> = { React: 4, "Next.js": 3, TypeScript: 3, JavaScript: 4, PostgreSQL: 3, HTML: 5, CSS: 4, Git: 3, Bootstrap: 4, "Node.js": 2, "REST API": 3 };
  await prisma.userSkill.deleteMany({ where: { userId } });
  for (const [name, level] of Object.entries(levels)) {
    const s = await skill(name);
    await prisma.userSkill.create({ data: { userId, skillId: s.id, level } });
  }

  await prisma.resume.deleteMany({ where: { userId } });
  const resume = await prisma.resume.create({
    data: {
      userId, fullName: "Camille Reyes", email: "camille.reyes@jobsync.dev", phone: "+63 917 555 0142", location: "Quezon City, Metro Manila",
      headline: "Junior Full Stack Developer", hasExperience: true, lastStep: "preview",
      githubUrl: "github.com/camille-reyes-dev", linkedinUrl: "linkedin.com/in/camille-reyes-dev", portfolioUrl: "camille-reyes.example.dev",
      summary: "Information technology graduate with a year of freelance and internship experience building responsive web apps with React, Next.js and PostgreSQL. Reduced page load time by 35% on a client storefront and shipped 4 production sites.",
      experiences: { create: [
        { company: "Self-employed", role: "Freelance Web Developer", location: "Remote", startDate: "2024-01", endDate: "", sortOrder: 0,
          description: "Built and launched 4 client websites using React, Next.js and Bootstrap.\nReduced page load time by 35% for an online store by optimising images and code splitting.\nDesigned PostgreSQL schemas and REST APIs for a booking app used by 120 customers." },
        { kind: "INTERNSHIP", company: "Silangan Web Studio", role: "Frontend Intern", department: "Web Development", location: "Makati", startDate: "2023-06", endDate: "2023-09", sortOrder: 1,
          description: "Converted 12 Figma pages into responsive HTML, CSS and JavaScript.\nFixed 30+ UI bugs and wrote reusable Bootstrap components." },
      ] },
      education: { create: [{ school: "Metro Manila Institute of Technology", degree: "Bachelor of Science", field: "Information Technology", startDate: "2020", endDate: "2024", sortOrder: 0, description: "Capstone: online queueing system for a barangay health center." }] },
      projects: { create: [
        { name: "Barangay Marketplace", url: "https://github.com/camille-reyes-dev/barangay-marketplace", technologies: "Next.js, TypeScript, PostgreSQL", sortOrder: 0, description: "Marketplace for neighborhood sellers with authentication, product listings and order tracking." },
        { name: "Budget Buddy", url: "", technologies: "React, Node.js", sortOrder: 1, description: "Personal finance tracker with monthly charts and CSV export." },
      ] },
      certifications: { create: [{ name: "Responsive Web Design", issuer: "freeCodeCamp", issuedDate: "2022-11", url: "", sortOrder: 0 }] },
      trainings: { create: [{ name: "Full Stack Web Development Bootcamp", provider: "Community coding group", date: "2023", description: "12-week hands-on program covering React, Node.js and SQL.", sortOrder: 0 }] },
    },
  });
  const resumeSkills: [string, string][] = [
    ["React", "Frontend Development"], ["Next.js", "Frontend Development"], ["TypeScript", "Programming Languages"], ["JavaScript", "Programming Languages"],
    ["PostgreSQL", "Databases & ORM"], ["HTML", "Frontend Development"], ["CSS", "Frontend Development"], ["Bootstrap", "Frontend Development"],
    ["Git", "Tools & Development"], ["REST API", "Web Development"],
  ];
  for (const [i, [name, category]] of resumeSkills.entries()) {
    const s = await skill(name);
    await prisma.resumeSkill.create({ data: { resumeId: resume.id, skillId: s.id, category, sortOrder: i } });
  }

  const jobByKey = async (key: string) => prisma.job.findFirstOrThrow({ where: { source: "seed", externalId: key } });

  // Saved jobs
  await prisma.savedJob.deleteMany({ where: { userId } });
  for (const [key, ago] of [["luntian-frontend", 1], ["sampaguita-nextjs", 3], ["alon-ui", 5]] as const) {
    const job = await jobByKey(key);
    await prisma.savedJob.create({ data: { userId, jobId: job.id, savedAt: daysAgo(ago) } });
  }

  // Applications with history
  await prisma.application.deleteMany({ where: { userId } });
  const apps: { key?: string; company: string; position: string; ago: number; next?: string; notes?: string; history: [ApplicationStatus, number, string][] }[] = [
    { key: "kapitan-fullstack-jr", company: "Kapitan Labs", position: "Junior Full Stack Developer", ago: 14, next: "Technical interview on Friday, 2:00 PM", notes: "Prepare a walkthrough of Barangay Marketplace.",
      history: [["APPLIED", 14, "Applied through the company site"], ["SCREENING", 10, "HR call, 20 minutes"], ["ASSESSMENT", 7, "Take-home task: build a small booking form"], ["INTERVIEW", 2, "Technical interview scheduled"]] },
    { key: "sampaguita-nextjs", company: "Sampaguita Studio", position: "Next.js Developer", ago: 9, next: "Waiting for assessment link",
      history: [["APPLIED", 9, "Applied with portfolio link"], ["SCREENING", 5, "Recruiter reviewed resume"]] },
    { key: "bayanihan-react", company: "Bayanihan Pay", position: "React Developer", ago: 20, notes: "Role required 3+ years; applied anyway.",
      history: [["APPLIED", 20, "Applied"], ["REJECTED", 12, "Email: looking for more experience"]] },
    { company: "Nagsasarili Apps", position: "Junior Web Developer", ago: 6, next: "Follow up on Monday",
      history: [["APPLIED", 6, "Applied via referral"]] },
    { company: "Bituin Software", position: "Frontend Developer", ago: 30, next: "Review offer letter by Friday", notes: "Offer: 38,000 monthly, hybrid.",
      history: [["APPLIED", 30, "Applied"], ["SCREENING", 26, "HR screening"], ["INTERVIEW", 18, "Two technical interviews"], ["OFFER", 4, "Verbal offer received"]] },
    { company: "Lakan Digital", position: "React Developer", ago: 25, history: [["APPLIED", 25, "Applied"], ["WITHDRAWN", 15, "Accepted a different opportunity"]] },
  ];
  for (const a of apps) {
    const job = a.key ? await jobByKey(a.key) : null;
    const last = a.history[a.history.length - 1];
    await prisma.application.create({
      data: {
        userId, jobId: job?.id, company: a.company, position: a.position, status: last[0], appliedAt: daysAgo(a.ago), nextStep: a.next, notes: a.notes,
        history: { create: a.history.map(([status, ago, note]) => ({ status, note, changedAt: daysAgo(ago) })) },
      },
    });
  }

  // Interview sessions
  await prisma.interviewSession.deleteMany({ where: { userId } });
  const ai = new MockAIProvider();
  const session = await prisma.interviewSession.create({
    data: { userId, category: "TECHNICAL", jobRole: "Junior Full Stack Developer", difficulty: "MEDIUM", createdAt: daysAgo(3) },
  });
  const qs = QUESTION_BANK.TECHNICAL.slice(0, 4);
  const answers = [
    "In Next.js, server components render on the server and send HTML with no client JavaScript, so they are good for data fetching and keeping the bundle small. Client components use the use client directive and handle interactivity like forms and state. For example, in my marketplace project the product list is a server component and the cart button is a client component.",
    "For a job tracker I would use resource-based REST endpoints such as GET and POST on applications, with status codes like 201 for created and 404 for missing records. I would validate input on the server and require authentication so users only see their own resource data.",
    "An inner join returns only rows that match in both tables, while a left join keeps every row from the left table and fills the match with null when there is none. For example, listing all users with their applications, including users who have none.",
    "I take the user id from the session on the server, never from the request, and filter every query by that id. That ownership check and server-side validation stop one user from reading another user's data.",
  ];
  for (const [i, q] of qs.entries()) {
    const created = await prisma.interviewQuestion.create({ data: { sessionId: session.id, text: q.text, hint: q.hint, expectedKeywords: q.expectedKeywords, sortOrder: i } });
    const fb = await ai.generateInterviewFeedback({ text: q.text, expectedKeywords: q.expectedKeywords, category: "TECHNICAL" }, answers[i], "MEDIUM");
    await prisma.interviewAnswer.create({ data: { questionId: created.id, answer: answers[i], score: fb.score, feedback: fb.feedback } });
    if (i === qs.length - 1) {
      const all = await prisma.interviewAnswer.findMany({ where: { question: { sessionId: session.id } } });
      await prisma.interviewSession.update({ where: { id: session.id }, data: { status: "COMPLETED", completedAt: daysAgo(3), score: Math.round(all.reduce((s, a) => s + a.score, 0) / all.length) } });
    }
  }
  await prisma.interviewSession.create({ data: { userId, category: "BEHAVIORAL", jobRole: "Frontend Developer", difficulty: "EASY", createdAt: daysAgo(1),
    questions: { create: QUESTION_BANK.BEHAVIORAL.slice(0, 3).map((q, i) => ({ text: q.text, hint: q.hint, expectedKeywords: q.expectedKeywords, sortOrder: i })) } } });

  // Analyses (deterministic demo provider)
  await prisma.resumeAnalysis.deleteMany({ where: { userId } });
  await prisma.aTSAnalysis.deleteMany({ where: { userId } });
  const full = await prisma.resume.findUniqueOrThrow({ where: { userId }, include: { experiences: true, education: true, projects: true, certifications: true, trainings: true, skills: { include: { skill: true } } } });
  const snapshot = {
    fullName: full.fullName, email: full.email, phone: full.phone, location: full.location, headline: full.headline, summary: full.summary,
    skills: full.skills.map((s) => s.skill.name),
    experiences: full.experiences.map((e) => ({ role: e.role, company: e.company, description: e.description, startDate: e.startDate, endDate: e.endDate })),
    education: full.education.map((e) => ({ school: e.school, degree: e.degree })),
    projects: full.projects.map((p) => ({ name: p.name, description: p.description, technologies: p.technologies })),
    certifications: [...full.certifications.map((c) => ({ name: c.name })), ...full.trainings.map((t) => ({ name: t.name }))],
  };
  const ra = await ai.analyzeResume(snapshot);
  await prisma.resumeAnalysis.create({ data: { userId, resumeId: resume.id, score: ra.score, sections: ra.sections, strengths: ra.strengths, weaknesses: ra.weaknesses, suggestions: ra.suggestions, keywordsFound: ra.keywordsFound, keywordsSuggested: ra.keywordsSuggested, provider: ai.name, isDemo: true } });
  for (const key of ["kapitan-fullstack-jr", "sampaguita-nextjs"]) {
    const job = await prisma.job.findFirstOrThrow({ where: { source: "seed", externalId: key }, include: { skills: { include: { skill: true } } } });
    const r = await ai.analyzeATS(snapshot, job.skills.map((s) => s.skill.name));
    await prisma.aTSAnalysis.create({ data: { userId, resumeId: resume.id, jobId: job.id, score: r.score, matchedKeywords: r.matchedKeywords, missingKeywords: r.missingKeywords, checks: r.checks, recommendations: r.recommendations, provider: ai.name, isDemo: true } });
  }
}

async function seedSecondUser() {
  const user = await upsertUser("Marco Santos", "marco.santos@jobsync.dev");
  await prisma.profile.update({ where: { userId: user.id }, data: { headline: "Backend Developer", location: "Cebu City", targetRoles: ["Backend Developer"] } });
  await prisma.application.deleteMany({ where: { userId: user.id } });
  await prisma.application.create({
    data: { userId: user.id, company: "Private Test Company", position: "Marco's private application", status: "APPLIED", notes: "Camille must never be able to see this.",
      history: { create: { status: "APPLIED", note: "Application added" } } },
  });
}

async function main() {
  console.log("Seeding jobs…");
  await seedJobs();
  console.log("Seeding demo users…");
  await seedCamille();
  await seedSecondUser();
  console.log("\nDone. Demo logins (password for both: %s)\n  camille.reyes@jobsync.dev  (full data)\n  marco.santos@jobsync.dev   (for testing authorization)", DEMO_PASSWORD);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
