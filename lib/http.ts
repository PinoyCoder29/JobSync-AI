import { toUserMessage } from "@/lib/errors";

/** Cookie-authenticated POST routes must only accept same-origin browser requests. */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser or same-origin GET-style navigation
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export const jsonError = (message: string, status: number) => Response.json({ error: message }, { status });

/**
 * Streams newline-delimited JSON events so the browser can show REAL progress
 * (reading -> extracting -> analyzing -> saving) instead of a fake timer.
 */
export function ndjsonResponse(run: (send: (event: Record<string, unknown>) => void) => Promise<void>) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        await run(send);
      } catch (error) {
        send({ type: "error", message: toUserMessage(error) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" },
  });
}
