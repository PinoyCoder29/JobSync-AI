"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDismissable } from "@/lib/client/useDismissable";

/**
 * A native <details> menu that behaves like a proper dropdown:
 * closes on outside click/tap, on Escape (focus returns to the trigger), when an item is chosen, and on navigation.
 * Keeps the existing markup (<summary> + panel) so existing CSS keeps working.
 */
export function DismissibleDetails({ className, summary, summaryClassName, children }: { className?: string; summary: React.ReactNode; summaryClassName?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const close = useCallback(() => {
    const el = ref.current;
    if (el?.open) {
      el.open = false;
      setOpen(false);
    }
  }, []);

  useDismissable(open, ref, close);
  useEffect(close, [pathname, close]);

  return (
    <details
      ref={ref}
      className={className}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          close();
          ref.current?.querySelector("summary")?.focus();
        }
      }}
      // choosing a link or a button inside the panel closes it
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a, button, [role='menuitem']") && !(e.target as HTMLElement).closest("summary")) close();
      }}
    >
      <summary className={summaryClassName}>{summary}</summary>
      {children}
    </details>
  );
}
