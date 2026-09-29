"use client";

import { useState } from "react";
import { useResume } from "@/context/ResumeContext";
import FormNav from "@/components/FormNav";
import {
  SKILL_CATEGORIES,
  CATEGORY_PLACEHOLDERS,
  SkillCategoryName,
} from "@/data/skillCategories";

export default function SkillsForm() {
  const { data, addSkill, removeSkill, goNext, goBack } = useResume();

  const [categoryName, setCategoryName] = useState<SkillCategoryName>(
    "Frontend Development",
  );

  const [customSkill, setCustomSkill] = useState("");

  const skills = data.skills || [];

  const skillExists = (skillName: string) => {
    return skills.some(
      (skill) => skill.name.toLowerCase() === skillName.toLowerCase(),
    );
  };

  const getSkillId = (skillName: string) => {
    const skill = skills.find(
      (item) => item.name.toLowerCase() === skillName.toLowerCase(),
    );

    return skill?.id;
  };

  const toggleSuggestedSkill = (skillName: string) => {
    const trimmedName = skillName.trim();

    if (!trimmedName) {
      return;
    }

    const existingSkillId = getSkillId(trimmedName);

    if (existingSkillId) {
      removeSkill(existingSkillId);
      return;
    }

    addSkill({
      id: crypto.randomUUID(),
      name: trimmedName,
      category: categoryName as any,
    });
  };

  const handleAddCustomSkill = () => {
    const trimmedName = customSkill.trim();

    if (!trimmedName) {
      return;
    }

    if (!skillExists(trimmedName)) {
      addSkill({
        id: crypto.randomUUID(),
        name: trimmedName,
        category: categoryName as any,
      });
    }

    setCustomSkill("");
  };

  const handleCustomSkillKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddCustomSkill();
    }
  };

  const groupedSkills: Record<string, typeof skills> = {};

  skills.forEach((skill) => {
    const category = skill.category?.trim() || "Technical";

    if (!groupedSkills[category]) {
      groupedSkills[category] = [];
    }

    groupedSkills[category].push(skill);
  });

  const canContinue = skills.length > 0;

  return (
    <div className="panel">
      <h2 className="panel-title">Skills</h2>

      <p className="panel-subtitle">
        Select a category and add the skills that best describe your experience.
      </p>

      {/* Skill Category */}
      <div className="mb-4">
        <label htmlFor="skillCategory" className="form-label fw-semibold">
          Skill Category
        </label>

        <select
          id="skillCategory"
          className="form-select"
          value={categoryName}
          onChange={(event) =>
            setCategoryName(event.target.value as SkillCategoryName)
          }
        >
          {Object.keys(SKILL_CATEGORIES).map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Suggested Skills */}
      <div className="mb-4">
        <label className="form-label fw-semibold">Suggested Skills</label>

        <div className="d-flex flex-wrap gap-2">
          {SKILL_CATEGORIES[categoryName].length === 0 ? (
            <div className="text-muted">
              No suggested skills for this category.
            </div>
          ) : (
            SKILL_CATEGORIES[categoryName].map((skill) => {
              const alreadyAdded = skillExists(skill);

              return (
                <button
                  key={skill}
                  type="button"
                  className={`btn ${
                    alreadyAdded ? "btn-dark" : "btn-outline-secondary"
                  }`}
                  onClick={() => toggleSuggestedSkill(skill)}
                >
                  {alreadyAdded ? "✓ " : "+ "}
                  {skill}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Selected Skills */}
      {skills.length > 0 && (
        <div className="mb-4">
          <label className="form-label fw-semibold">Selected Skills</label>

          <div className="d-flex flex-column gap-3">
            {Object.entries(groupedSkills).map(([category, categorySkills]) => (
              <div key={category}>
                <div className="small fw-semibold text-secondary mb-2">
                  {category}
                </div>

                <div className="d-flex flex-wrap gap-2">
                  {categorySkills.map((skill) => (
                    <div
                      key={skill.id}
                      className="d-inline-flex align-items-center bg-dark text-white rounded px-3 py-2"
                    >
                      <span>{skill.name}</span>

                      <button
                        type="button"
                        className="btn btn-sm text-white p-0 ms-2"
                        onClick={() => removeSkill(skill.id)}
                        aria-label={`Remove ${skill.name}`}
                        style={{
                          lineHeight: 1,
                          fontSize: "18px",
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="small text-muted mt-3">
            {skills.length} skill
            {skills.length !== 1 ? "s" : ""} selected
          </div>
        </div>
      )}

      {/* Custom Skill */}
      <div className="mb-4">
        <label htmlFor="customSkill" className="form-label fw-semibold">
          Add Custom Skill
        </label>

        <div className="input-group">
          <input
            id="customSkill"
            type="text"
            className="form-control"
            value={customSkill}
            onChange={(event) => setCustomSkill(event.target.value)}
            onKeyDown={handleCustomSkillKeyDown}
            placeholder={CATEGORY_PLACEHOLDERS[categoryName]}
          />

          <button
            type="button"
            className="btn btn-dark"
            onClick={handleAddCustomSkill}
            disabled={!customSkill.trim()}
          >
            Add Skill
          </button>
        </div>
      </div>

      {/* Navigation */}
      <FormNav onBack={goBack} onNext={goNext} nextDisabled={!canContinue} />
    </div>
  );
}
