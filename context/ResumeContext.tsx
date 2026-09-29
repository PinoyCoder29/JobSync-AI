"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import {
  ResumeData,
  emptyResumeData,
  WizardStep,
  PersonalInfo,
  ExperienceEntry,
  InternshipEntry,
  EducationEntry,
  SkillEntry,
  ProjectEntry,
  CertificationEntry,
  TrainingEntry,
  HasExperience,
} from "@/types/resume";

import { deleteResumeAction, saveResumeStepAction } from "@/app/actions/resume.actions";

interface ResumeContextValue {
  data: ResumeData;
  currentStep: WizardStep;
  visibleSteps: WizardStep[];
  currentStepIndex: number;

  updatePersonalInfo: (info: Partial<PersonalInfo>) => void;
  setHasExperience: (value: HasExperience) => void;

  addExperience: (entry: ExperienceEntry) => void;
  updateExperience: (id: string, entry: Partial<ExperienceEntry>) => void;
  removeExperience: (id: string) => void;

  addInternship: (entry: InternshipEntry) => void;
  updateInternship: (id: string, entry: Partial<InternshipEntry>) => void;
  removeInternship: (id: string) => void;

  addEducation: (entry: EducationEntry) => void;
  updateEducation: (id: string, entry: Partial<EducationEntry>) => void;
  removeEducation: (id: string) => void;

  addSkill: (entry: SkillEntry) => void;
  removeSkill: (id: string) => void;

  addProject: (entry: ProjectEntry) => void;
  updateProject: (id: string, entry: Partial<ProjectEntry>) => void;
  removeProject: (id: string) => void;

  addCertification: (entry: CertificationEntry) => void;
  updateCertification: (id: string, entry: Partial<CertificationEntry>) => void;
  removeCertification: (id: string) => void;

  addTraining: (entry: TrainingEntry) => void;
  updateTraining: (id: string, entry: Partial<TrainingEntry>) => void;
  removeTraining: (id: string) => void;

  saving: boolean;
  saveError: string | null;
  clearSaveError: () => void;
  goNext: () => Promise<void>;
  goBack: () => Promise<void>;
  goToStep: (step: WizardStep) => Promise<void>;
  resetAll: () => Promise<void>;
}

const ResumeContext = createContext<ResumeContextValue | undefined>(undefined);

// The full step order. "experience-entries" is filtered out at runtime
// whenever the user picked "wala pang experience" — this is what makes the
// branch in the wizard work without duplicating any screens.
const ALL_STEPS: WizardStep[] = [
  "personal-info",
  "experience-question",
  "experience-entries",
  "internship",
  "education",
  "skills",
  "projects",
  "certifications",
  "preview",
];

export function ResumeProvider({
  initialData,
  initialStep,
  children,
}: {
  initialData: ResumeData;
  initialStep: WizardStep | null;
  children: ReactNode;
}) {
  // The database is the source of truth: the server passes the saved resume in,
  // and every "Continue" saves the current step back through a server action.
  const [data, setData] = useState<ResumeData>({ ...emptyResumeData, ...initialData });
  const [currentStep, setCurrentStep] = useState<WizardStep>(initialStep ?? "personal-info");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const clearSaveError = useCallback(() => setSaveError(null), []);

  const visibleSteps = useMemo(() => {
    if (data.hasExperience === "no") {
      return ALL_STEPS.filter((s) => s !== "experience-entries");
    }
    return ALL_STEPS;
  }, [data.hasExperience]);

  const currentStepIndex = visibleSteps.indexOf(currentStep);

  const updatePersonalInfo = useCallback((info: Partial<PersonalInfo>) => {
    setData((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, ...info } }));
  }, []);

  const setHasExperience = useCallback((value: HasExperience) => {
    setData((prev) => ({ ...prev, hasExperience: value }));
  }, []);

  const addExperience = useCallback((entry: ExperienceEntry) => {
    setData((prev) => ({ ...prev, experience: [...prev.experience, entry] }));
  }, []);

  const updateExperience = useCallback((id: string, entry: Partial<ExperienceEntry>) => {
    setData((prev) => ({
      ...prev,
      experience: prev.experience.map((e) => (e.id === id ? { ...e, ...entry } : e)),
    }));
  }, []);

  const removeExperience = useCallback((id: string) => {
    setData((prev) => ({ ...prev, experience: prev.experience.filter((e) => e.id !== id) }));
  }, []);

  const addInternship = useCallback((entry: InternshipEntry) => {
    setData((prev) => ({ ...prev, internship: [...prev.internship, entry] }));
  }, []);

  const updateInternship = useCallback((id: string, entry: Partial<InternshipEntry>) => {
    setData((prev) => ({
      ...prev,
      internship: prev.internship.map((e) => (e.id === id ? { ...e, ...entry } : e)),
    }));
  }, []);

  const removeInternship = useCallback((id: string) => {
    setData((prev) => ({ ...prev, internship: prev.internship.filter((e) => e.id !== id) }));
  }, []);

  const addEducation = useCallback((entry: EducationEntry) => {
    setData((prev) => ({ ...prev, education: [...prev.education, entry] }));
  }, []);

  const updateEducation = useCallback((id: string, entry: Partial<EducationEntry>) => {
    setData((prev) => ({
      ...prev,
      education: prev.education.map((e) => (e.id === id ? { ...e, ...entry } : e)),
    }));
  }, []);

  const removeEducation = useCallback((id: string) => {
    setData((prev) => ({ ...prev, education: prev.education.filter((e) => e.id !== id) }));
  }, []);

  const addSkill = useCallback((entry: SkillEntry) => {
    setData((prev) => ({ ...prev, skills: [...prev.skills, entry] }));
  }, []);

  const removeSkill = useCallback((id: string) => {
    setData((prev) => ({ ...prev, skills: prev.skills.filter((s) => s.id !== id) }));
  }, []);

  const addProject = useCallback((entry: ProjectEntry) => {
    setData((prev) => ({ ...prev, projects: [...prev.projects, entry] }));
  }, []);

  const updateProject = useCallback((id: string, entry: Partial<ProjectEntry>) => {
    setData((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === id ? { ...p, ...entry } : p)),
    }));
  }, []);

  const removeProject = useCallback((id: string) => {
    setData((prev) => ({ ...prev, projects: prev.projects.filter((p) => p.id !== id) }));
  }, []);

  const addCertification = useCallback((entry: CertificationEntry) => {
    setData((prev) => ({ ...prev, certifications: [...prev.certifications, entry] }));
  }, []);

  const updateCertification = useCallback((id: string, entry: Partial<CertificationEntry>) => {
    setData((prev) => ({
      ...prev,
      certifications: prev.certifications.map((c) => (c.id === id ? { ...c, ...entry } : c)),
    }));
  }, []);

  const removeCertification = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((c) => c.id !== id),
    }));
  }, []);

  const addTraining = useCallback((entry: TrainingEntry) => {
    setData((prev) => ({ ...prev, trainings: [...prev.trainings, entry] }));
  }, []);

  const updateTraining = useCallback((id: string, entry: Partial<TrainingEntry>) => {
    setData((prev) => ({
      ...prev,
      trainings: prev.trainings.map((t) => (t.id === id ? { ...t, ...entry } : t)),
    }));
  }, []);

  const removeTraining = useCallback((id: string) => {
    setData((prev) => ({ ...prev, trainings: prev.trainings.filter((t) => t.id !== id) }));
  }, []);

  // Which slice of the data does each step own? Only that slice is sent to the server.
  const payloadFor = useCallback(
    (step: WizardStep): unknown => {
      switch (step) {
        case "personal-info": return data.personalInfo;
        case "experience-question": return data.hasExperience;
        case "experience-entries": return data.experience;
        case "internship": return data.internship;
        case "education": return data.education;
        case "skills": return data.skills;
        case "projects": return data.projects;
        case "certifications": return { certifications: data.certifications, trainings: data.trainings };
        default: return undefined; // preview has nothing to save
      }
    },
    [data],
  );

  const stepAfter = useCallback(
    (step: WizardStep, delta: 1 | -1) => {
      const idx = visibleSteps.indexOf(step);
      return visibleSteps[Math.min(Math.max(idx + delta, 0), visibleSteps.length - 1)];
    },
    [visibleSteps],
  );

  /** Saves the current step, then moves to `target`. Returns false if saving failed. */
  const saveThenMove = useCallback(
    async (target: WizardStep, opts: { blockOnError: boolean }) => {
      setSaveError(null);
      if (currentStep !== "preview") {
        setSaving(true);
        try {
          const res = await saveResumeStepAction(currentStep, payloadFor(currentStep), target);
          if (!res.ok) {
            setSaveError(res.message ?? "We couldn't save this step.");
            if (opts.blockOnError) return;
          }
        } catch {
          setSaveError("We couldn't reach the server. Check your connection and try again.");
          if (opts.blockOnError) return;
        } finally {
          setSaving(false);
        }
      }
      setCurrentStep(target);
    },
    [currentStep, payloadFor],
  );

  const goNext = useCallback(() => saveThenMove(stepAfter(currentStep, 1), { blockOnError: true }), [saveThenMove, stepAfter, currentStep]);
  // Going back still saves what you typed, but never traps you on an error.
  const goBack = useCallback(() => saveThenMove(stepAfter(currentStep, -1), { blockOnError: false }), [saveThenMove, stepAfter, currentStep]);
  const goToStep = useCallback((step: WizardStep) => saveThenMove(step, { blockOnError: true }), [saveThenMove]);

  const resetAll = useCallback(async () => {
    const res = await deleteResumeAction();
    if (!res.ok) {
      setSaveError(res.message ?? "We couldn't clear your resume.");
      return;
    }
    setData(emptyResumeData);
    setCurrentStep("personal-info");
  }, []);

  const value: ResumeContextValue = {
    data,
    currentStep,
    visibleSteps,
    currentStepIndex,
    updatePersonalInfo,
    setHasExperience,
    addExperience,
    updateExperience,
    removeExperience,
    addInternship,
    updateInternship,
    removeInternship,
    addEducation,
    updateEducation,
    removeEducation,
    addSkill,
    removeSkill,
    addProject,
    updateProject,
    removeProject,
    addCertification,
    updateCertification,
    removeCertification,
    addTraining,
    updateTraining,
    removeTraining,
    saving,
    saveError,
    clearSaveError,
    goNext,
    goBack,
    goToStep,
    resetAll,
  };

  return <ResumeContext.Provider value={value}>{children}</ResumeContext.Provider>;
}

export function useResume() {
  const ctx = useContext(ResumeContext);
  if (!ctx) throw new Error("useResume must be used within a ResumeProvider");
  return ctx;
}
