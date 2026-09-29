"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { ResumeData } from "@/types/resume";
import ResumePDFDocument from "./ResumePDFDocument";

interface DownloadPdfButtonProps {
  data: ResumeData;
}

export default function DownloadPdfButton({ data }: DownloadPdfButtonProps) {
  const fullName = data.personalInfo.fullName?.trim() || "resume";

  const fileName = `${fullName.replace(/\s+/g, "-")}-Resume.pdf`;

  return (
    <PDFDownloadLink
      document={<ResumePDFDocument data={data} />}
      fileName={fileName}
      className="btn btn-dark px-4 py-2"
      style={{
        textDecoration: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        fontWeight: 600,
      }}
    >
      Download PDF{" "}
    </PDFDownloadLink>
  );
}
