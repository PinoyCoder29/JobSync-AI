import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link
} from "@react-pdf/renderer";

import { ResumeData, SkillEntry } from "@/types/resume";

interface ResumePDFDocumentProps {
  data: ResumeData;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 30,
    paddingLeft: 42,
    paddingRight: 42,
    fontFamily: "Helvetica",
    fontSize: 8.5,
    lineHeight: 1.2,
    color: "#111111",
  },

  header: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#111111",
    paddingBottom: 6,
    marginBottom: 7,
  },

  name: {
    fontFamily: "Helvetica-Bold",
    fontSize: 19,
    marginBottom: 1,
  },

  jobTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginBottom: 2,
  },

  contact: {
    fontSize: 7.5,
    lineHeight: 1.2,
  },

  section: {
    marginBottom: 5,
  },

  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5,
    borderBottomWidth: 0.6,
    borderBottomColor: "#777777",
    paddingBottom: 2,
    marginBottom: 3,
  },

  paragraph: {
    fontSize: 8.3,
    lineHeight: 1.2,
  },

  entry: {
    marginBottom: 4,
  },

  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  entryMain: {
    flex: 1,
    paddingRight: 8,
  },

  entryTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
  },

  entrySubtitle: {
    fontFamily: "Helvetica-Bold",
    marginTop: 0,
    fontSize: 8,
  },

  entryMeta: {
    fontSize: 7.3,
    textAlign: "right",
    maxWidth: 135,
  },

  entryDescription: {
    marginTop: 1,
    fontSize: 8,
    lineHeight: 1.2,
  },

  skillLine: {
    marginBottom: 1,
    fontSize: 8,
    lineHeight: 1.15,
  },

  skillCategory: {
    fontFamily: "Helvetica-Bold",
  },

  technologies: {
    fontFamily: "Helvetica-Bold",
  },

  link: {
    color: "#111111",
    textDecoration: "none",
    fontSize: 7.5,
  },

  smallText: {
    fontSize: 7.8,
    lineHeight: 1.15,
  },
});

export default function ResumePDFDocument({ data }: ResumePDFDocumentProps) {
  const personalInfo = data.personalInfo || {};
  const experience = data.experience || [];
  const internship = data.internship || [];
  const education = data.education || [];
  const skills = data.skills || [];
  const projects = data.projects || [];
  const certifications = data.certifications || [];
  const trainings = data.trainings || [];

  const skillsByCategory = skills.reduce<Record<string, SkillEntry[]>>(
    (groups, skill) => {
      const category = skill.category?.trim() || "Technical";

      if (!groups[category]) {
        groups[category] = [];
      }

      groups[category].push(skill);

      return groups;
    },
    {},
  );

  const formatDateRange = (start?: string, end?: string) => {
    if (!start && !end) {
      return "";
    }

    if (start && end) {
      return `${start} - ${end}`;
    }

    return start || end || "";
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.name}>
            {personalInfo.fullName || "Your Name"}
          </Text>

          {personalInfo.jobTitle && (
            <Text style={styles.jobTitle}>{personalInfo.jobTitle}</Text>
          )}

          <Text style={styles.contact}>
            {[
              personalInfo.email,
              personalInfo.phone,
              personalInfo.location,
              personalInfo.linkedin,
              personalInfo.github,
              personalInfo.portfolio,
            ]
              .filter(Boolean)
              .join(" | ")}
          </Text>
        </View>

        {/* PROFESSIONAL SUMMARY */}
        {personalInfo.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PROFESSIONAL SUMMARY</Text>

            <Text style={styles.paragraph}>{personalInfo.summary}</Text>
          </View>
        )}

        {/* WORK EXPERIENCE */}
        {experience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>WORK EXPERIENCE</Text>

            {experience.map((entry) => (
              <View key={entry.id} style={styles.entry}>
                <View style={styles.entryHeader}>
                  <View style={styles.entryMain}>
                    <Text style={styles.entryTitle}>{entry.position}</Text>

                    <Text style={styles.entrySubtitle}>{entry.company}</Text>
                  </View>

                  <View style={styles.entryMeta}>
                    <Text>
                      {formatDateRange(entry.startDate, entry.endDate)}
                    </Text>

                    {entry.location && <Text>{entry.location}</Text>}
                  </View>
                </View>

                {entry.description && (
                  <Text style={styles.entryDescription}>
                    {entry.description}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* INTERNSHIP / OJT */}
        {internship.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>INTERNSHIP / OJT</Text>

            {internship.map((entry) => (
              <View key={entry.id} style={styles.entry}>
                <View style={styles.entryHeader}>
                  <View style={styles.entryMain}>
                    <Text style={styles.entryTitle}>{entry.position}</Text>

                    <Text style={styles.entrySubtitle}>{entry.company}</Text>

                    {entry.department && (
                      <Text style={styles.smallText}>
                        Department: {entry.department}
                      </Text>
                    )}
                  </View>

                  <View style={styles.entryMeta}>
                    <Text>
                      {formatDateRange(entry.startDate, entry.endDate)}
                    </Text>

                    {entry.location && <Text>{entry.location}</Text>}
                  </View>
                </View>

                {entry.description && (
                  <Text style={styles.entryDescription}>
                    {entry.description}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* EDUCATION */}
        {education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EDUCATION</Text>

            {education.map((entry) => (
              <View key={entry.id} style={styles.entry}>
                <View style={styles.entryHeader}>
                  <View style={styles.entryMain}>
                    <Text style={styles.entryTitle}>{entry.degree}</Text>

                    <Text style={styles.entrySubtitle}>{entry.school}</Text>

                    {entry.honors && (
                      <Text style={styles.smallText}>{entry.honors}</Text>
                    )}
                  </View>

                  <View style={styles.entryMeta}>
                    <Text>
                      {formatDateRange(entry.startDate, entry.endDate)}
                    </Text>

                    {entry.location && <Text>{entry.location}</Text>}
                  </View>
                </View>

                {entry.summary && (
                  <Text style={styles.entryDescription}>{entry.summary}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* SKILLS */}
        {skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SKILLS</Text>

            {Object.entries(skillsByCategory).map(
              ([categoryName, categorySkills]) => (
                <View key={categoryName} style={styles.skillLine}>
                  <Text style={styles.skillCategory}>{categoryName}:</Text>

                  <Text>
                    {" "}
                    {categorySkills.map((skill) => skill.name).join(", ")}
                  </Text>
                </View>
              ),
            )}
          </View>
        )}

        {/* PROJECTS */}
        {projects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PROJECTS</Text>

            {projects.map((project) => (
              <View key={project.id} style={styles.entry}>
                <View style={styles.entryHeader}>
                  <View style={styles.entryMain}>
                    <Text style={styles.entryTitle}>{project.name}</Text>

                    {project.role && (
                      <Text style={styles.entrySubtitle}>{project.role}</Text>
                    )}

                    {project.organization && (
                      <Text style={styles.smallText}>
                        {project.organization}
                      </Text>
                    )}
                  </View>

                  {project.date && (
                    <Text style={styles.entryMeta}>{project.date}</Text>
                  )}
                </View>

                {project.description && (
                  <Text style={styles.entryDescription}>
                    {project.description}
                  </Text>
                )}

                {project.skillsUsed && (
                  <Text style={styles.entryDescription}>
                    <Text style={styles.technologies}>Technologies:</Text>{" "}
                    {project.skillsUsed}
                  </Text>
                )}

                {project.url && (
                  <Link src={project.url} style={styles.link}>
                    {project.url}
                  </Link>
                )}
              </View>
            ))}
          </View>
        )}

        {/* CERTIFICATIONS */}
        {certifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CERTIFICATIONS</Text>

            {certifications.map((entry) => (
              <View key={entry.id} style={styles.entry}>
                <Text style={styles.entryTitle}>{entry.name}</Text>

                <Text style={styles.entrySubtitle}>{entry.issuer}</Text>

                {entry.issueDate && (
                  <Text style={styles.smallText}>{entry.issueDate}</Text>
                )}

                {entry.expirationDate && (
                  <Text style={styles.smallText}>
                    Expiration: {entry.expirationDate}
                  </Text>
                )}

                {entry.credentialId && (
                  <Text style={styles.smallText}>
                    Credential ID: {entry.credentialId}
                  </Text>
                )}

                {entry.credentialUrl && (
                  <Link src={entry.credentialUrl} style={styles.link}>
                    {entry.credentialUrl}
                  </Link>
                )}
              </View>
            ))}
          </View>
        )}

        {/* TRAINING */}
        {trainings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TRAINING</Text>

            {trainings.map((entry) => (
              <View key={entry.id} style={styles.entry}>
                <Text style={styles.entryTitle}>{entry.name}</Text>

                {entry.provider && (
                  <Text style={styles.entrySubtitle}>{entry.provider}</Text>
                )}

                {entry.date && (
                  <Text style={styles.smallText}>{entry.date}</Text>
                )}

                {entry.description && (
                  <Text style={styles.entryDescription}>
                    {entry.description}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
