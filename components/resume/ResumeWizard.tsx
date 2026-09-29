"use client";

import PersonalInfoForm from "@/components/forms/PersonalInfoForm";
import ExperienceQuestion from "@/components/forms/ExperienceQuestion";
import ExperienceForm from "@/components/forms/ExperienceForm";
import InternshipForm from "@/components/forms/InternshipForm";
import EducationForm from "@/components/forms/EducationForm";
import SkillsForm from "@/components/forms/SkillsForm";
import ProjectsForm from "@/components/forms/ProjectsForm";
import CertificationsForm from "@/components/forms/CertificationsForm";
import PreviewStep from "@/components/forms/PreviewStep";
import StepIndicator from "@/components/StepIndicator";
import { useResume } from "@/context/ResumeContext";
import type { WizardStep } from "@/types/resume";

const STEP_COMPONENTS: Record<WizardStep, React.ComponentType> = {
  "personal-info": PersonalInfoForm,
  "experience-question": ExperienceQuestion,
  "experience-entries": ExperienceForm,
  internship: InternshipForm,
  education: EducationForm,
  skills: SkillsForm,
  projects: ProjectsForm,
  certifications: CertificationsForm,
  preview: PreviewStep,
};

export function ResumeWizard() {
  const { currentStep, visibleSteps, goToStep, saving, saveError, clearSaveError } = useResume();
  const StepComponent = STEP_COMPONENTS[currentStep] ?? PersonalInfoForm;

  return (
    <div className="wizard">
      <div className="mb-4">
        <StepIndicator steps={visibleSteps} currentStep={currentStep} onStepClick={goToStep} disabled={saving} />
      </div>

      {saveError && (
        <div className="alert alert-danger d-flex justify-content-between align-items-start gap-3" role="alert">
          <span>{saveError}</span>
          <button type="button" className="btn-close" aria-label="Dismiss" onClick={clearSaveError} />
        </div>
      )}

      <StepComponent />
    </div>
  );
}
