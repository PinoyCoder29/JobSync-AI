import type { ResumeInput } from "@/lib/validations/resume";

const range = (start: string, end: string) => (start ? `${start} – ${end || "Present"}` : end);

export function ResumePreview({ data }: { data: ResumeInput }) {
  const contact = [data.email, data.phone, data.location].filter(Boolean);
  return (
    <article className="resume-paper" aria-label="Resume preview">
      <header>
        <h2 className="resume-name">{data.fullName || "Your name"}</h2>
        {data.headline && <p className="resume-headline">{data.headline}</p>}
        {contact.length > 0 && <p className="resume-contact">{contact.join("  |  ")}</p>}
      </header>

      {data.summary && (<section><h3>Summary</h3><p>{data.summary}</p></section>)}

      {data.experiences.length > 0 && (
        <section>
          <h3>Experience</h3>
          {data.experiences.map((e, i) => (
            <div key={i} className="resume-item">
              <div className="d-flex justify-content-between gap-2"><strong>{e.role}{e.company && `, ${e.company}`}</strong><span className="resume-date">{range(e.startDate, e.endDate)}</span></div>
              {e.location && <div className="resume-sub">{e.location}</div>}
              {e.description && <p className="resume-desc">{e.description}</p>}
            </div>
          ))}
        </section>
      )}

      {data.education.length > 0 && (
        <section>
          <h3>Education</h3>
          {data.education.map((e, i) => (
            <div key={i} className="resume-item">
              <div className="d-flex justify-content-between gap-2"><strong>{e.degree}{e.field && ` in ${e.field}`}</strong><span className="resume-date">{range(e.startDate, e.endDate)}</span></div>
              <div className="resume-sub">{e.school}</div>
              {e.description && <p className="resume-desc">{e.description}</p>}
            </div>
          ))}
        </section>
      )}

      {data.skills.length > 0 && (<section><h3>Skills</h3><p>{data.skills.join(" • ")}</p></section>)}

      {data.projects.length > 0 && (
        <section>
          <h3>Projects</h3>
          {data.projects.map((p, i) => (
            <div key={i} className="resume-item">
              <strong>{p.name}</strong>{p.technologies && <span className="resume-sub"> — {p.technologies}</span>}
              {p.description && <p className="resume-desc">{p.description}</p>}
            </div>
          ))}
        </section>
      )}

      {data.certifications.length > 0 && (
        <section>
          <h3>Certifications</h3>
          {data.certifications.map((c, i) => (
            <div key={i} className="resume-item d-flex justify-content-between gap-2"><span><strong>{c.name}</strong>{c.issuer && `, ${c.issuer}`}</span><span className="resume-date">{c.issuedDate}</span></div>
          ))}
        </section>
      )}
    </article>
  );
}
