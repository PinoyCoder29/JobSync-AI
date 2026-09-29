"use client";

import { useState } from "react";

/** Filters render inline on desktop and as a slide-in panel on mobile. */
export function FiltersDrawer({ children, activeCount }: { children: React.ReactNode; activeCount: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-outline-brand d-lg-none w-100 mb-3" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="filters-panel">
        <i className="bi bi-sliders me-1" aria-hidden="true" /> Filters{activeCount ? ` (${activeCount})` : ""}
      </button>
      {open && <div className="drawer-backdrop d-lg-none" onClick={() => setOpen(false)} />}
      <div id="filters-panel" className={`filters-panel ${open ? "open" : ""}`}>
        <div className="d-flex justify-content-between align-items-center d-lg-none mb-3">
          <strong>Filters</strong>
          <button type="button" className="btn-close" aria-label="Close filters" onClick={() => setOpen(false)} />
        </div>
        {children}
      </div>
    </>
  );
}
