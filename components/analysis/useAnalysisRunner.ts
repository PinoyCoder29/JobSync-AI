"use client";

import { useCallback, useRef, useState } from "react";

export type RunStage = "uploading" | "reading" | "extracting" | "analyzing" | "comparing" | "saving";
export type RunState = { status: "idle" | "running" | "error"; stage: RunStage | null; uploadPct: number | null; error: string | null };

const IDLE: RunState = { status: "idle", stage: null, uploadPct: null, error: null };

type ServerEvent = { type: "stage"; stage: RunStage } | { type: "done"; id: string; cached: boolean } | { type: "error"; message: string };

/**
 * Posts FormData with XMLHttpRequest (fetch can't report upload progress) and reads the
 * newline-delimited JSON events the server streams back, so the stages shown are real.
 */
export function useAnalysisRunner(url: string) {
  const [state, setState] = useState<RunState>(IDLE);
  const busy = useRef(false); // blocks double submits even before React re-renders

  const run = useCallback(
    (form: FormData, hasUpload: boolean) =>
      new Promise<{ id: string; cached: boolean } | null>((resolve) => {
        if (busy.current) return resolve(null);
        busy.current = true;
        setState({ status: "running", stage: hasUpload ? "uploading" : "reading", uploadPct: hasUpload ? 0 : null, error: null });

        const xhr = new XMLHttpRequest();
        let consumed = 0;
        let finished = false;

        const fail = (message: string) => {
          if (finished) return;
          finished = true;
          busy.current = false;
          setState({ status: "error", stage: null, uploadPct: null, error: message });
          resolve(null);
        };
        const succeed = (result: { id: string; cached: boolean }) => {
          if (finished) return;
          finished = true;
          busy.current = false;
          setState(IDLE);
          resolve(result);
        };
        const handle = (event: ServerEvent) => {
          if (event.type === "stage") setState((s) => ({ ...s, stage: event.stage }));
          else if (event.type === "done") succeed({ id: event.id, cached: event.cached });
          else if (event.type === "error") fail(event.message);
        };
        const drain = () => {
          const chunk = xhr.responseText.slice(consumed);
          const lastNewline = chunk.lastIndexOf("\n");
          if (lastNewline < 0) return;
          consumed += lastNewline + 1;
          for (const line of chunk.slice(0, lastNewline).split("\n")) {
            if (!line.trim()) continue;
            try { handle(JSON.parse(line) as ServerEvent); } catch { /* ignore a partial/garbled line */ }
          }
        };

        xhr.open("POST", url);
        xhr.timeout = 100_000;
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setState((s) => ({ ...s, uploadPct: Math.round((e.loaded / e.total) * 100) }));
        };
        xhr.upload.onload = () => setState((s) => ({ ...s, stage: "reading", uploadPct: hasUpload ? 100 : null }));
        xhr.onprogress = drain;
        xhr.onload = () => {
          if (xhr.status >= 400) {
            let message = "Something went wrong. Please try again.";
            try { message = (JSON.parse(xhr.responseText) as { error?: string }).error ?? message; } catch { /* keep default */ }
            if (xhr.status === 401) message = "Your session expired. Please log in again.";
            return fail(message);
          }
          drain();
          if (!finished) fail("The analysis ended unexpectedly. Please try again.");
        };
        xhr.onerror = () => fail("We couldn't reach the server. Check your connection and try again.");
        xhr.ontimeout = () => fail("This is taking too long. Please try again.");
        xhr.send(form);
      }),
    [url],
  );

  const reset = useCallback(() => setState(IDLE), []);
  return { state, run, reset };
}
