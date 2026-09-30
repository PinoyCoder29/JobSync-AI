"use client";

import { useCallback, useEffect, useState } from "react";
import { THEME_STORAGE_KEY } from "./theme-script";

type Mode = "light" | "dark" | "system";

const OPTIONS: { mode: Mode; label: string; icon: string }[] = [
  { mode: "light", label: "Light", icon: "bi-sun" },
  { mode: "dark", label: "Dark", icon: "bi-moon-stars" },
  { mode: "system", label: "System", icon: "bi-display" },
];

function apply(mode: Mode) {
  const dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const root = document.documentElement;
  root.setAttribute("data-theme", dark ? "dark" : "light");
  root.setAttribute("data-bs-theme", dark ? "dark" : "light");
  root.setAttribute("data-theme-mode", mode);
}

export function ThemeToggle() {
  // null until mounted: the server can't know the saved choice, so we avoid a hydration mismatch.
  const [mode, setMode] = useState<Mode | null>(null);

  useEffect(() => {
    const saved = document.documentElement.getAttribute("data-theme-mode");
    setMode(saved === "light" || saved === "dark" ? saved : "system");
  }, []);

  // While on "System", follow the operating system if it changes.
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const choose = useCallback((next: Mode) => {
    setMode(next);
    apply(next);
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* private mode: still works for this visit */ }
  }, []);

  return (
    <div className="theme-toggle" role="group" aria-label="Color theme">
      {OPTIONS.map((o) => (
        <button key={o.mode} type="button" onClick={() => choose(o.mode)} aria-pressed={mode === o.mode} title={`${o.label} theme`}>
          <i className={`bi ${o.icon}`} aria-hidden="true" />
          <span className="d-none d-xl-inline">{o.label}</span>
          <span className="visually-hidden d-xl-none">{o.label} theme</span>
        </button>
      ))}
    </div>
  );
}
