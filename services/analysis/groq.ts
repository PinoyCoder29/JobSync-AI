import { AppError } from "@/lib/errors";

const BASE = "https://api.groq.com/openai/v1/chat/completions";

export const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

type GroqResponse = {
  choices?: {
    message?: {
      content?: string | null;
    };
    finish_reason?: string | null;
  }[];
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
};

/**
 * Server-side only.
 *
 * The API key comes from the environment and is never sent
 * to the browser.
 *
 * Requests Groq to return valid JSON and parses the result.
 */
export async function generateJson(
  systemInstruction: string,
  userContent: string,
): Promise<{ json: unknown; model: string }> {
  return generateJsonTurns(systemInstruction, [
    {
      role: "user",
      text: userContent,
    },
  ]);
}

export type GroqTurn = {
  role: "user" | "assistant";
  text: string;
};

/**
 * Same as generateJson but supports multi-turn conversations.
 *
 * This can also be reused later for:
 * - Career AI
 * - Interview AI
 * - AI Assistant
 * - Resume analysis
 */
export async function generateJsonTurns(
  systemInstruction: string,
  turns: GroqTurn[],
  opts: {
    temperature?: number;
    maxOutputTokens?: number;
  } = {},
): Promise<{ json: unknown; model: string }> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new AppError(
      "AI analysis isn't set up on this server yet (GROQ_API_KEY is missing).",
    );
  }

  const messages = [
    {
      role: "system" as const,
      content: systemInstruction,
    },
    ...turns.map((turn) => ({
      role: turn.role,
      content: turn.text,
    })),
  ];

  const body = JSON.stringify({
    model: GROQ_MODEL,
    messages,

    temperature: opts.temperature ?? 0.2,

    max_tokens: opts.maxOutputTokens ?? 16000,

    response_format: {
      type: "json_object",
    },
  });

  let lastStatus = 0;

  for (let attempt = 0; attempt < 2; attempt++) {
    let res: Response;

    try {
      res = await fetch(BASE, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },

        body,

        signal: AbortSignal.timeout(55_000),

        cache: "no-store",
      });
    } catch (error) {
      console.error("Groq request failed:", (error as Error).name);

      throw new AppError(
        (error as Error).name === "TimeoutError"
          ? "The AI took too long to respond. Please try again."
          : "We couldn't reach the AI service. Check your connection and try again.",
      );
    }

    lastStatus = res.status;

    if (res.ok) {
      const data = (await res.json()) as GroqResponse;

      if (data.error) {
        console.error("Groq API error:", {
          type: data.error.type,
          code: data.error.code,
          message: data.error.message,
        });

        throw new AppError(
          "The AI service returned an error. Please try again.",
        );
      }

      const choice = data.choices?.[0];

      const text = choice?.message?.content ?? "";

      if (!text.trim()) {
        throw new AppError(
          "The AI returned an empty answer. Please try again.",
        );
      }

      if (choice?.finish_reason === "length") {
        throw new AppError("The AI answer was cut off. Please try again.");
      }

      return {
        json: parseJsonLoose(text),
        model: GROQ_MODEL,
      };
    }

    /*
     * Retry temporary failures once.
     *
     * 429 = rate limit
     * 500/502/503 = temporary provider failure
     */
    if (
      (res.status === 429 ||
        res.status === 500 ||
        res.status === 502 ||
        res.status === 503) &&
      attempt === 0
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      continue;
    }

    break;
  }

  console.error("Groq responded with status", lastStatus);

  if (lastStatus === 400) {
    throw new AppError(
      "Groq rejected the request. Check the model and AI request configuration.",
    );
  }

  if (lastStatus === 401 || lastStatus === 403) {
    throw new AppError(
      "The Groq API key is invalid or does not have permission to use the AI service.",
    );
  }

  if (lastStatus === 404) {
    throw new AppError(
      `The configured Groq model "${GROQ_MODEL}" could not be found. Check GROQ_MODEL.`,
    );
  }

  if (lastStatus === 429) {
    throw new AppError(
      "The AI service is busy or the Groq usage limit was reached. Please try again later.",
    );
  }

  if (lastStatus === 500 || lastStatus === 502 || lastStatus === 503) {
    throw new AppError(
      "The Groq AI service is temporarily unavailable. Please try again shortly.",
    );
  }

  throw new AppError(
    "The AI service is temporarily unavailable. Please try again shortly.",
  );
}

/**
 * Groq JSON Object Mode normally returns valid JSON,
 * but this fallback makes the integration more tolerant
 * of markdown fences or surrounding text.
 */
function parseJsonLoose(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        // Continue to final error.
      }
    }

    throw new AppError(
      "The AI returned an unreadable answer. Please try again.",
    );
  }
}

export const isGroqConfigured = () => Boolean(process.env.GROQ_API_KEY);
