import { MockAIProvider } from "./mock-ai-provider";
import type { AIProvider } from "./types";

/**
 * SINGLE swap point for a future AI provider.
 * When you choose one, implement AIProvider (e.g. FutureAIProvider) and return it here.
 */
let provider: AIProvider | null = null;
export function getAIProvider(): AIProvider {
  return (provider ??= new MockAIProvider());
}
export type { AIProvider } from "./types";
