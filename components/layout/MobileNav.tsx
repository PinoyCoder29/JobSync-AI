"use client";

import { useEffect, useState } from "react";
import { NavLinks } from "./NavLinks";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="d-lg-none">
      <button
        type="button"
        className="btn btn-outline-brand btn-sm"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="mobile-nav"
      >
        <i className="bi bi-list me-1" aria-hidden="true" /> Menu
      </button>
      {open && (
        <div className="drawer-backdrop" onClick={() => setOpen(false)} />
      )}
      <aside
        id="mobile-nav"
        className={`drawer ${open ? "open" : ""}`}
        aria-hidden={!open}
        aria-label="Navigation menu"
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <span className="brand">
            JobSync <span className="brand-ai">AI</span>
          </span>
          <button
            type="button"
            className="btn-close"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
        </div>
        <NavLinks onNavigate={() => setOpen(false)} />
      </aside>
    </div>
  );
}
