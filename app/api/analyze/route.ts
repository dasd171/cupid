import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { createAIProvider } from "@/lib/ai/factory";
import type { AIProvider, VisionImage } from "@/lib/ai/provider";
import { parseChat } from "@/lib/analysis/parser";
import { computeStats, statsToPromptText } from "@/lib/analysis/analyzer";
import { finalizeScores } from "@/lib/analysis/scoring";
import { buildFinalReport } from "@/lib/analysis/report";
import { parseAIResponse, type AIAnalysis } from "@/types/analysis";
import type { ChatMessage } from "@/types/chat";
import { createTempDir, cleanupTemporaryFiles } from "@/lib/privacy/cleanup";
import { checkRateLimit } from "@/lib/rate-limit";
import { saveReport } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_CHAT_BYTES = 20 * 1024 * 1024;
const MAX_CHAT_TEXT_CHARS = 2_000_000;
const MAX_BODY_BYTES = 64 * 1024 * 1024;
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const CHAT_EXTENSIONS = new Set([".txt", ".json", ".csv", ".html", ".htm"]);
const EXCERPT_BUDGET_CHARS = 12_000;

/* ── prompt templates ───────────────────────────────────────────── */

let promptCache: Record<string, string> | null = null;

async function loadPrompts(): Promise<Record<string, string>> {
  if (promptCache) return promptCache;
  const dir = path.join(process.cwd(), "prompts");
  const names = ["system.txt", "relationship-analysis.txt", "communication-analysis.txt", "report.txt"];
  const loaded: Record<string, string> = {};
  for (const name of names) {
    loaded[name] = await fs.readFile(path.join(dir, name), "utf8");
  }
  promptCache = loaded;
  return loaded;
}

/* ── helpers ────────────────────────────────────────────────────── */

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function cleanName(value: unknown): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 80);
}

/** Build a head+tail excerpt of the conversation within a char budget. */
function buildExcerpt(
  messages: ChatMessage[],
  personA: string,
  personB: string,
): string {
  const label = (m: ChatMessage) =>
    m.sender === "A" ? personA : m.sender === "B" ? personB : "Unknown";
  const lines = messages.map(
    (m) => `${label(m)}${m.timestamp ? ` [${m.timestamp}]` : ""}: ${m.content}`,
  );
  const total = lines.join("\n").length;
  if (total <= EXCERPT_BUDGET_CHARS) return lines.join("\n");
  const half = Math.floor(EXCERPT_BUDGET_CHARS / 2);
  let head = "";
  let headCount = 0;
  for (const line of lines) {
    if (head.length + line.length + 1 > half) break;
    head += line + "\n";
    headCount++;
  }
  let tail = "";
  for (let i = lines.length - 1; i >= headCount; i--) {
    const line = lines[i] ?? "";
    if (tail.length + line.length + 1 > half) break;
    tail = line + "\n" + tail;
  }
  const skipped = lines.length - headCount - tail.split("\n").filter(Boolean).length;
  return (
    `${head.trimEnd()}\n\n[… ${skipped} messages omitted …]\n\n${tail.trimEnd()}`
  );
}

/** Resize + strip EXIF, return a base64 JPEG ready for vision models. */
async function processPhoto(file: File, fieldName: string): Promise<VisionImage> {
  const buffer = Buffer.from(await file.arrayBuffer());
  let processed: Buffer;
  try {
    processed = await sharp(buffer)
      .rotate() // apply EXIF orientation, then drop all metadata
      .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch {
    throw new Error(`"${fieldName}" is not a readable image file.`);
  }
  return { mimeType: "image/jpeg", data: processed.toString("base64") };
}

/** Ask the vision model for scene/interaction context only. Non-fatal. */
async function describePhotos(
  provider: AIProvider,
  images: VisionImage[],
): Promise<string | undefined> {
  try {
    const res = await provider.analyzeVision({
      systemPrompt:
        "You describe photos factually and neutrally. You never judge people's " +
        "attractiveness, worth, or romantic suitability from appearance.",
      prompt:
        "These photos were optionally provided as context for a relationship " +
        "conversation analysis. Describe ONLY observable, non-identifying " +
        "context: the setting/scene, the activity or interaction visible, and " +
        "the general mood of the scene. Do NOT describe, rate, or judge " +
        "anyone's physical appearance, age, or attractiveness. Do NOT attempt " +
        "to identify the people. Keep it under 150 words.\n\n" +
        'Return JSON only: {"sceneContext": "..."}',
      images,
      jsonMode: true,
    });
    const parsed = JSON.parse(res.text) as { sceneContext?: unknown };
    if (typeof parsed.sceneContext === "string" && parsed.sceneContext.trim()) {
      return parsed.sceneContext.trim().slice(0, 800);
    }
    return undefined;
  } catch {
    return undefined; // vision context is auxiliary; never fail the analysis
  }
}

async function analyzeWithRetry(provider: AIProvider, prompt: string): Promise<AIAnalysis> {
  const first = await provider.analyzeText(prompt);
  try {
    return parseAIResponse(first.text);
  } catch {
    const second = await provider.analyzeText(
      `${prompt}\n\nIMPORTANT: Your previous reply was invalid. Return valid JSON only, ` +
        `exactly matching the required schema. No markdown fences, no extra text.`,
    );
    return parseAIResponse(second.text);
  }
}

/* ── route ──────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`analyze:${clientIp(req)}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
      },
    );
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }

  let tempDir = "";
  console.log("Analysis started");
  try {
    const form = await req.formData();

    const personA = cleanName(form.get("personA")) || "Person A";
    const personB = cleanName(form.get("personB")) || "Person B";

    const photoA = form.get("photoA");
    const photoB = form.get("photoB");
    const chatFile = form.get("chatFile");
    const chatText = String(form.get("chatText") ?? "");

    // ── validate uploads ──
    const photos: Array<{ file: File; field: string }> = [];
    for (const [value, field] of [
      [photoA, "photoA"],
      [photoB, "photoB"],
    ] as const) {
      if (value instanceof File && value.size > 0) {
        if (value.size > MAX_IMAGE_BYTES) {
          return NextResponse.json(
            { error: `Photo "${field}" must be 10 MB or smaller.` },
            { status: 413 },
          );
        }
        if (!IMAGE_MIME_TYPES.has(value.type)) {
          return NextResponse.json(
            { error: `Photo "${field}" must be JPG, PNG or WebP.` },
            { status: 400 },
          );
        }
        photos.push({ file: value, field });
      }
    }

    let chatContent = "";
    let chatFilename: string | undefined;
    if (chatFile instanceof File && chatFile.size > 0) {
      if (chatFile.size > MAX_CHAT_BYTES) {
        return NextResponse.json(
          { error: "Chat file must be 20 MB or smaller." },
          { status: 413 },
        );
      }
      const ext = path.extname(chatFile.name).toLowerCase();
      if (!CHAT_EXTENSIONS.has(ext)) {
        return NextResponse.json(
          { error: "Chat file must be TXT, JSON, CSV or HTML." },
          { status: 400 },
        );
      }
      chatFilename = chatFile.name;
      chatContent = Buffer.from(await chatFile.arrayBuffer()).toString("utf8");
    } else if (chatText.trim().length > 0) {
      chatContent = chatText.slice(0, MAX_CHAT_TEXT_CHARS);
    } else {
      return NextResponse.json(
        { error: "Please upload a chat file or paste the conversation." },
        { status: 400 },
      );
    }

    // ── isolated temp dir (deleted in `finally`) ──
    tempDir = await createTempDir();
    const chatPath = path.join(
      tempDir,
      `${randomUUID()}${path.extname(chatFilename ?? ".txt") || ".txt"}`,
    );
    await fs.writeFile(chatPath, chatContent, "utf8");

    // ── parse + deterministic stats ──
    const parsed = parseChat(chatContent, { personA, personB }, chatFilename);
    if (parsed.messages.length === 0) {
      return NextResponse.json(
        {
          error:
            "No messages could be parsed. Try exporting as TXT/JSON/CSV/HTML, or paste lines like “Name: message”.",
        },
        { status: 400 },
      );
    }
    const stats = computeStats(parsed.messages);

    // ── AI provider ──
    let provider: AIProvider;
    try {
      provider = createAIProvider();
    } catch (err) {
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : "AI provider is not configured. See the Settings page.",
        },
        { status: 500 },
      );
    }

    // ── photos → vision context (auxiliary only) ──
    const visionImages: VisionImage[] = [];
    for (const { file, field } of photos) {
      visionImages.push(await processPhoto(file, field));
    }
    const visualContext =
      visionImages.length > 0 ? await describePhotos(provider, visionImages) : undefined;

    // ── build prompt from templates ──
    const prompts = await loadPrompts();
    const statsText = statsToPromptText(stats, personA, personB);
    const excerpt = buildExcerpt(parsed.messages, personA, personB);
    const prompt = [
      prompts["system.txt"],
      "─── ANALYSIS GUIDE ───",
      prompts["relationship-analysis.txt"],
      "─── DETERMINISTIC STATISTICS (ground truth, do not contradict) ───",
      prompts["communication-analysis.txt"],
      statsText,
      visualContext
        ? `─── PHOTO CONTEXT (auxiliary only; never judge appearance) ───\n${visualContext}`
        : "─── PHOTO CONTEXT ───\nNo photos were provided.",
      `─── CONVERSATION (${personA} = A, ${personB} = B) ───`,
      excerpt,
      "─── REQUIRED OUTPUT ───",
      prompts["report.txt"],
    ].join("\n\n");

    // ── AI analysis with one retry ──
    let ai: AIAnalysis;
    try {
      ai = await analyzeWithRetry(provider, prompt);
    } catch {
      console.log("Analysis failed");
      return NextResponse.json(
        {
          error:
            "The AI could not produce a valid analysis. Please try again in a moment.",
        },
        { status: 502 },
      );
    }

    // ── scoring + report ──
    const scored = finalizeScores(ai, stats);
    const report = buildFinalReport({
      personA,
      personB,
      stats,
      ai,
      scored,
      visualContext,
    });
    const id = saveReport(report);

    console.log("Analysis completed");
    return NextResponse.json({ id });
  } catch (err) {
    console.log("Analysis failed");
    // Never leak internals, paths, or user content in the error response.
    const message =
      err instanceof Error && err.message.startsWith('"')
        ? err.message
        : "Analysis failed unexpectedly. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (tempDir) await cleanupTemporaryFiles(tempDir);
  }
}
