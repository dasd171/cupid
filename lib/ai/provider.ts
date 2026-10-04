/**
 * Unified AI provider interface.
 *
 * Business logic must only depend on this interface — never on a concrete
 * vendor SDK. Providers are created via lib/ai/factory.ts based on
 * environment configuration.
 */

export interface VisionImage {
  /** e.g. "image/jpeg" */
  mimeType: string;
  /** base64-encoded image bytes (no data-URI prefix) */
  data: string;
}

export interface VisionInput {
  prompt: string;
  systemPrompt?: string;
  images: VisionImage[];
  /** Ask the model to restrict output to JSON. */
  jsonMode?: boolean;
  maxTokens?: number;
}

export interface AIResponse {
  /** Raw model text output. */
  text: string;
}

export interface AIProvider {
  /** Human-readable provider name for logs and the settings page. Never a secret. */
  readonly name: string;
  analyzeText(input: string): Promise<AIResponse>;
  analyzeVision(input: VisionInput): Promise<AIResponse>;
}
