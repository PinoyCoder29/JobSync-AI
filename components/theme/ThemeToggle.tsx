"use client";

import { useCallback, useEffect, useState } from "react";
import { THEME_STORAGE_KEY } from "./theme-script";

type Mode = "light" | "dark";

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("light");
  const [mounted, setMounted] = useState(false);

  const applyTheme = useCallback((next: Mode) => {
    const root = document.documentElement;

    root.setAttribute("data-theme", next);
    root.setAttribute("data-bs-theme", next);
    root.setAttribute("data-theme-mode", next);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore localStorage errors.
    }
  }, []);

  useEffect(() => {
    const saved = document.documentElement.getAttribute("data-theme-mode");

    const initial: Mode = saved === "dark" ? "dark" : "light";

    setMode(initial);
    setMounted(true);
  }, []);

  const toggleTheme = useCallback(() => {
    const next: Mode = mode === "dark" ? "light" : "dark";

    setMode(next);
    applyTheme(next);
  }, [mode, applyTheme]);

  if (!mounted) {
    return (
      <div className="theme-switch" aria-hidden="true">
        <div className="theme-switch-thumb">
          <i className="bi bi-sun-fill" />
        </div>
      </div>
    );
  }

  const isDark = mode === "dark";

  return (
    <button
      type="button"
      className={`theme-switch ${
        isDark ? "theme-switch-dark" : "theme-switch-light"
      }`}
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="theme-switch-icon theme-switch-sun">
        <i className="bi bi-sun-fill" />
      </span>

      <span className="theme-switch-icon theme-switch-moon">
        <i className="bi bi-moon-stars-fill" />
      </span>

      <span className="theme-switch-thumb">
        <i className={isDark ? "bi bi-moon-stars-fill" : "bi bi-sun-fill"} />
      </span>
    </button>
  );
}
