"use client";

import { useState } from "react";
import { useResume } from "@/context/ResumeContext";
import FormNav from "@/components/FormNav";
import ResumePreview from "@/components/resume/ResumePreview";
import dynamic from "next/dynamic";
import Link from "next/link";

// @react-pdf/renderer only works in the browser, so it is loaded client-side only.
const DownloadPdfButton = dynamic(() => import("@/components/resume/DownloadPdfButton"), {
  ssr: false,
  loading: () => <button type="button" className="btn btn-ink px-4 py-2" disabled>Preparing PDF…</button>,
});

export default function PreviewStep() {
  const { data, goBack, resetAll } = useResume();
  const [showDownload, setShowDownload] = useState(false);

  const handleContinue = () => {
    setShowDownload(true);
  };

  const handleStartNewResume = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to start a new resume? Your current resume data will be cleared.",
    );

    if (!confirmed) {
      return;
    }

    await resetAll();
    setShowDownload(false);
  };

  if (showDownload) {
    return (
      <div className="panel">
        <h2 className="panel-title">Resume Ready</h2>

        <p className="panel-subtitle">
          Your resume is ready. You can now download your PDF.
        </p>

        <div className="border rounded p-4 bg-light text-center">
          <h4 className="mb-3">Your resume is ready!</h4>

          <p className="text-muted mb-4">
            Click the button below to download your resume as a PDF.
          </p>

          <DownloadPdfButton data={data} />

          <p className="small text-muted mt-3 mb-0">
            Your resume is saved to your account. Next: <Link href="/resume-analyzer">run the resume analyzer</Link> or{" "}
            <Link href="/ats-checker">check it against a job</Link>.
          </p>

          <div className="mt-4 pt-3 border-top">
            <p className="text-muted mb-2">Want to create another resume?</p>

            <button
              type="button"
              className="btn btn-outline-brand"
              onClick={handleStartNewResume}
            >
              + Create New Resume
            </button>
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setShowDownload(false)}
          >
            Back to Preview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Preview & Download</h2>

      <p className="panel-subtitle">Preview your resume before downloading.</p>

      <div
        style={{
          overflowX: "auto",
          padding: "20px 0",
          backgroundColor: "#f5f5f5",
        }}
      >
        <ResumePreview data={data} />
      </div>

      <FormNav onBack={goBack} onNext={handleContinue} nextDisabled={false} />
    </div>
  );
}
