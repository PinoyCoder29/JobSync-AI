"use client";

import { useEffect, type RefObject } from "react";

/**
 * Shared "dismiss" behaviour for every popup/menu in the app.
 * While `open`, it calls `onClose` when the user: presses/taps outside `ref`, or presses Escape.
 * (Closing on selection and on navigation is handled by the components that use it.)
 * Uses pointerdown so it works for mouse, touch and pen, and fires before focus moves.
 */
export function useDismissable(open: boolean, ref: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, ref, onClose]);
}
