"use client";

import { useEffect } from "react";
import { HEARTBEAT_MS } from "@/lib/presence";

/**
 * Tells the server "this user is here" every 45 seconds while the app is open in a VISIBLE tab (and right away on
 * open / when the tab regains focus). Renders nothing. Swap this for an SSE/WebSocket connection later.
 */
export function PresenceHeartbeat() {
  useEffect(() => {
    const beat = () => {
      if (document.visibilityState === "visible") void fetch("/api/presence", { method: "POST", keepalive: true }).catch(() => undefined);
    };
    beat();
    const timer = window.setInterval(beat, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", beat);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", beat);
    };
  }, []);
  return null;
}
