import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export const metadata: Metadata = {
  title: "JobSync AI – Job search, resume and interview prep in one place",
  description: "Search jobs, build a resume, check ATS compatibility, track every application and practice interviews.",
};

const FEATURES = [
  { icon: "bi-search", title: "Find jobs that fit", text: "Search by title, skill, salary and work arrangement, then see how well each job matches your profile." },
  { icon: "bi-file-earmark-person", title: "Build one strong resume", text: "Edit on the left, see the finished page on the right. Your resume is saved to your account." },
  { icon: "bi-check2-square", title: "Check ATS readiness", text: "Compare your resume with a specific job and see which keywords are missing." },
  { icon: "bi-kanban", title: "Track every application", text: "Keep status, notes and next steps together, with a timeline of each change." },
  { icon: "bi-chat-square-text", title: "Practice interviews", text: "Answer HR, behavioral, technical and situational questions and get feedback." },
  { icon: "bi-bar-chart-steps", title: "See your skill gaps", text: "Compare your skills with what open jobs ask for and decide what to learn next." },
];

export default async function Home() {
  const session = await auth();
  return (
    <div className="landing">
      <header className="landing-header container">
        <span className="brand">JobSync <span className="brand-ai">AI</span></span>
        <nav className="d-flex align-items-center gap-2" aria-label="Account">
          <ThemeToggle />
          <Link href="/jobs" className="btn btn-link text-body">Browse jobs</Link>
          {session?.user ? (
            <Link href="/dashboard" className="btn btn-brand">Open dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-outline-brand">Log in</Link>
              <Link href="/register" className="btn btn-brand">Get started</Link>
            </>
          )}
        </nav>
      </header>

      <section className="container hero">
        <div className="row align-items-center g-5">
          <div className="col-lg-6">
            <h1 className="hero-title">Your next job search, organised in one place.</h1>
            <p className="hero-text">Search openings, tailor your resume to each one, track where every application stands, and rehearse the interview before it happens.</p>
            <div className="d-flex flex-wrap gap-2">
              <Link href="/register" className="btn btn-brand btn-lg">Create free account</Link>
              <Link href="/jobs" className="btn btn-outline-brand btn-lg">Browse jobs</Link>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="hero-preview" aria-label="Example of a job match">
              <div className="d-flex justify-content-between align-items-start gap-3">
                <div>
                  <h2 className="job-title mb-1">Junior Full Stack Developer</h2>
                  <p className="job-company mb-0">Kapitan Labs · Makati · Hybrid</p>
                </div>
                <span className="match-pill tone-good">87% match</span>
              </div>
              <p className="job-salary mt-3">₱30,000 – ₱40,000 <span className="text-muted fw-normal">/ month</span></p>
              <div className="d-flex flex-wrap gap-1 mb-3">
                {["React", "Next.js", "TypeScript", "PostgreSQL"].map((s) => <span key={s} className="skill-badge skill-have">{s}</span>)}
                <span className="skill-badge skill-missing">Docker</span>
              </div>
              <p className="small text-muted mb-0">Sample card. Scores in the app are demo values until a matching service is connected.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container features">
        <h2 className="section-title mb-4">Everything for the search, nothing you don't need</h2>
        <div className="row g-4">
          {FEATURES.map((f) => (
            <div className="col-md-6 col-lg-4" key={f.title}>
              <div className="feature">
                <i className={`bi ${f.icon}`} aria-hidden="true" />
                <h3 className="sub-title">{f.title}</h3>
                <p className="text-muted mb-0">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <footer className="container py-4 small text-muted">© {new Date().getFullYear()} JobSync AI. Analyses and match scores are demo results.</footer>
    </div>
  );
}
