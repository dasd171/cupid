import type { AIProvider, AIResponse, VisionInput } from "./provider";

export interface OpenAICompatibleConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Label shown in logs/settings, e.g. "openai" or "openai-compatible". */
  label?: string;
  timeoutMs?: number;
}

interface ChatMessage {
  role: "system" | "user";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
}

/**
 * Works with OpenAI itself and any OpenAI-compatible chat-completions API
 * (OpenRouter, local servers, …). No vendor SDK — plain fetch.
 */
export class OpenAICompatibleProvider implements AIProvider {
  readonly name: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(config: OpenAICompatibleConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.timeoutMs = config.timeoutMs ?? 120_000;
    this.name = config.label ?? "openai-compatible";
  }

  async analyzeText(input: string): Promise<AIResponse> {
    const { text } = await this.chat([
      { role: "user", content: input },
    ]);
    return { text };
  }

  async analyzeVision(input: VisionInput): Promise<AIResponse> {
    const content: ChatMessage["content"] = [
      { type: "text", text: input.prompt },
      ...input.images.map((img) => ({
        type: "image_url" as const,
        image_url: { url: `data:${img.mimeType};base64,${img.data}` },
      })),
    ];
    const messages: ChatMessage[] = [];
    if (input.systemPrompt) messages.push({ role: "system", content: input.systemPrompt });
    messages.push({ role: "user", content });
    const { text } = await this.chat(messages, input.jsonMode);
    return { text };
  }

  private async chat(
    messages: ChatMessage[],
    jsonMode = true,
  ): Promise<AIResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
          temperature: 0.3,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(
          `AI provider request failed (HTTP ${res.status}): ${body.slice(0, 300)}`,
        );
      }
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
      };
      const text = data.choices?.[0]?.message?.content ?? "";
      if (!text.trim()) throw new Error("AI provider returned empty content.");
      return { text };
    } finally {
      clearTimeout(timer);
    }
  }
}
