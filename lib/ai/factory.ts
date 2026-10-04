import { GeminiProvider } from "./gemini";
import { OllamaProvider } from "./ollama";
import { OpenAICompatibleProvider } from "./openai";
import type { AIProvider } from "./provider";

export type ProviderKind = "openai" | "compat" | "ollama" | "gemini";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(
      `Missing required environment variable ${name} for the configured AI provider. ` +
        `See .env.example and the Settings page.`,
    );
  }
  return value.trim();
}

/**
 * Create the configured AI provider from environment variables.
 * Throws a human-readable error when configuration is incomplete.
 */
export function createAIProvider(): AIProvider {
  const kind = (process.env.AI_PROVIDER ?? "openai").trim().toLowerCase() as ProviderKind;

  switch (kind) {
    case "ollama": {
      const baseUrl = (process.env.OLLAMA_BASE_URL ?? "http://localhost:11434").trim();
      const model = requiredEnv("OLLAMA_MODEL");
      return new OllamaProvider({ baseUrl, model });
    }
    case "gemini": {
      return new GeminiProvider({
        apiKey: requiredEnv("GEMINI_API_KEY"),
        model: (process.env.GEMINI_MODEL ?? "gemini-1.5-flash").trim(),
      });
    }
    case "compat": {
      return new OpenAICompatibleProvider({
        baseUrl: requiredEnv("AI_BASE_URL"),
        apiKey: requiredEnv("AI_API_KEY"),
        model: requiredEnv("AI_MODEL"),
        label: "openai-compatible",
      });
    }
    case "openai":
    default: {
      return new OpenAICompatibleProvider({
        baseUrl: (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").trim(),
        apiKey: requiredEnv("OPENAI_API_KEY"),
        model: (process.env.OPENAI_MODEL ?? "gpt-4o-mini").trim(),
        label: "openai",
      });
    }
  }
}

/** Provider name for health checks / settings. Never includes secrets. */
export function activeProviderName(): string {
  const kind = (process.env.AI_PROVIDER ?? "openai").trim().toLowerCase();
  if (kind === "ollama") return "ollama";
  if (kind === "gemini") return "gemini";
  if (kind === "compat") return "openai-compatible";
  return "openai";
}

/** Model identifier only (safe to display). */
export function activeModelName(): string {
  const kind = (process.env.AI_PROVIDER ?? "openai").trim().toLowerCase();
  if (kind === "ollama") return process.env.OLLAMA_MODEL?.trim() || "(not set)";
  if (kind === "gemini")
    return (process.env.GEMINI_MODEL ?? "gemini-1.5-flash").trim();
  if (kind === "compat") return process.env.AI_MODEL?.trim() || "(not set)";
  return (process.env.OPENAI_MODEL ?? "gpt-4o-mini").trim();
}
