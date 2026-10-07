import { AppError } from "@/lib/errors";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
};

/**
 * Server-side only. The key comes from the environment and is never sent to the browser.
 * Asks Gemini for JSON and returns the parsed (still unvalidated) value.
 */
export async function generateJson(systemInstruction: string, userContent: string): Promise<{ json: unknown; model: string }> {
  return generateJsonTurns(systemInstruction, [{ role: "user", text: userContent }]);
}

export type GeminiTurn = { role: "user" | "model"; text: string };

/** Same as generateJson but for a multi-turn conversation (assistant chat, AI interviewer). Still server-side only. */
export async function generateJsonTurns(
  systemInstruction: string,
  turns: GeminiTurn[],
  opts: { temperature?: number; maxOutputTokens?: number } = {},
): Promise<{ json: unknown; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AppError("AI analysis isn't set up on this server yet (GEMINI_API_KEY is missing).");

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    generationConfig: { responseMimeType: "application/json", temperature: opts.temperature ?? 0.2, maxOutputTokens: opts.maxOutputTokens ?? 16000 },
  });

  let lastStatus = 0;
  for (let attempt = 0; attempt < 2; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${BASE}/${GEMINI_MODEL}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body,
        signal: AbortSignal.timeout(55_000),
        cache: "no-store",
      });
    } catch (error) {
      console.error("Gemini request failed:", (error as Error).name);
      throw new AppError((error as Error).name === "TimeoutError" ? "The AI took too long to respond. Please try again." : "We couldn't reach the AI service. Check your connection and try again.");
    }

    lastStatus = res.status;
    if (res.ok) {
      const data = (await res.json()) as GeminiResponse;
      if (data.promptFeedback?.blockReason) throw new AppError("The AI couldn't process this document. Try removing unusual content.");
      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (!text.trim()) throw new AppError("The AI returned an empty answer. Please try again.");
      if (candidate?.finishReason === "MAX_TOKENS") throw new AppError("The AI answer was cut off. Please try again.");
      return { json: parseJsonLoose(text), model: GEMINI_MODEL };
    }

    if ((res.status === 500 || res.status === 503) && attempt === 0) {
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }
    break;
  }

  // Log the status only (never the key or the document text), show a safe message.
  console.error("Gemini responded with status", lastStatus);
  if (lastStatus === 429) throw new AppError("The AI service is busy right now. Please wait a minute and try again.");
  if (lastStatus === 400 || lastStatus === 401 || lastStatus === 403 || lastStatus === 404) {
    throw new AppError("The AI service rejected the request. The server's API key or model setting may need attention.");
  }
  throw new AppError("The AI service is temporarily unavailable. Please try again shortly.");
}

function parseJsonLoose(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { /* fall through */ }
    }
    throw new AppError("The AI returned an unreadable answer. Please try again.");
  }
}
export const isGeminiConfigured = () => Boolean(process.env.GEMINI_API_KEY);
