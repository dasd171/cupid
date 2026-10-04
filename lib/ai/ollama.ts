import type { AIProvider, AIResponse, VisionInput } from "./provider";

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  timeoutMs?: number;
}

interface OllamaMessage {
  role: "system" | "user";
  content: string;
  images?: string[];
}

/**
 * Local Ollama provider. Uses POST /api/chat with base64 images —
 * no SDK, plain fetch.
 */
export class OllamaProvider implements AIProvider {
  readonly name = "ollama";
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(config: OllamaConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.model = config.model;
    this.timeoutMs = config.timeoutMs ?? 180_000;
  }

  async analyzeText(input: string): Promise<AIResponse> {
    return this.chat([{ role: "user", content: input }], true);
  }

  async analyzeVision(input: VisionInput): Promise<AIResponse> {
    const messages: OllamaMessage[] = [];
    if (input.systemPrompt) {
      messages.push({ role: "system", content: input.systemPrompt });
    }
    messages.push({
      role: "user",
      content: input.prompt,
      images: input.images.map((img) => img.data),
    });
    return this.chat(messages, input.jsonMode);
  }

  private async chat(
    messages: OllamaMessage[],
    jsonMode = true,
  ): Promise<AIResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: false,
          ...(jsonMode ? { format: "json" } : {}),
          options: { temperature: 0.3 },
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(
          `Ollama request failed (HTTP ${res.status}): ${body.slice(0, 300)}`,
        );
      }
      const data = (await res.json()) as {
        message?: { content?: string };
        error?: string;
      };
      if (data.error) throw new Error(`Ollama error: ${data.error}`);
      const text = data.message?.content ?? "";
      if (!text.trim()) throw new Error("Ollama returned empty content.");
      return { text };
    } finally {
      clearTimeout(timer);
    }
  }
}
