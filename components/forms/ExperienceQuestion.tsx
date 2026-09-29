"use client";

import { useResume } from "@/context/ResumeContext";
import FormNav from "@/components/FormNav";
import { HasExperience } from "@/types/resume";

export default function ExperienceQuestion() {
  const { data, setHasExperience, goNext, goBack } = useResume();

  const choose = (value: HasExperience) => setHasExperience(value);

  return (
    <div className="panel">
      <h2 className="panel-title">Do You Have Work Experience?</h2>

      <p className="panel-subtitle">
        This will determine which sections are shown next. There is no right or
        wrong answer — the template is designed to fit both situations.
      </p>

      <div className="row g-3">
        <div className="col-md-6">
          <div
            role="button"
            className={`choice-card ${
              data.hasExperience === "yes" ? "is-selected" : ""
            }`}
            onClick={() => choose("yes")}
          >
            <div className="choice-title">I have work experience</div>

            <div className="choice-desc">
              Includes previous jobs, part-time work, freelance work, or
              internships. You can add one or more entries in the next step.
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div
            role="button"
            className={`choice-card ${
              data.hasExperience === "no" ? "is-selected" : ""
            }`}
            onClick={() => choose("no")}
          >
            <div className="choice-title">I don't have work experience</div>

            <div className="choice-desc">
              You're a fresh graduate or looking for your first job. We'll skip
              the work history section and focus on your education, skills, and
              training.
            </div>
          </div>
        </div>
      </div>

      <FormNav
        onBack={goBack}
        onNext={goNext}
        nextDisabled={data.hasExperience === null}
      />
    </div>
  );
}
