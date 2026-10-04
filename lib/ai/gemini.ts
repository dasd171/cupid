import type { AIProvider, AIResponse, VisionInput } from "./provider";

export interface GeminiConfig {
  apiKey: string;
  model: string;
  timeoutMs?: number;
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

/**
 * Google Gemini provider via the REST generateContent endpoint.
 * No vendor SDK — plain fetch.
 */
export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(config: GeminiConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.timeoutMs = config.timeoutMs ?? 120_000;
  }

  async analyzeText(input: string): Promise<AIResponse> {
    return this.generate([{ text: input }], true);
  }

  async analyzeVision(input: VisionInput): Promise<AIResponse> {
    const parts: GeminiPart[] = [];
    if (input.systemPrompt) parts.push({ text: input.systemPrompt });
    parts.push({ text: input.prompt });
    for (const img of input.images) {
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
    }
    return this.generate(parts, input.jsonMode);
  }

  private async generate(
    parts: GeminiPart[],
    jsonMode = true,
  ): Promise<AIResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/` +
        `${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature: 0.3,
            ...(jsonMode ? { responseMimeType: "application/json" } : {}),
          },
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(
          `Gemini request failed (HTTP ${res.status}): ${body.slice(0, 300)}`,
        );
      }
      const data = (await res.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
        error?: { message?: string };
      };
      if (data.error?.message) throw new Error(`Gemini error: ${data.error.message}`);
      const text =
        data.candidates?.[0]?.content?.parts
          ?.map((p) => p.text ?? "")
          .join("") ?? "";
      if (!text.trim()) throw new Error("Gemini returned empty content.");
      return { text };
    } finally {
      clearTimeout(timer);
    }
  }
}
