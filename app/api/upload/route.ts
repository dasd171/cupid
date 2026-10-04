import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { parseChat } from "@/lib/analysis/parser";
import { createTempDir, cleanupTemporaryFiles } from "@/lib/privacy/cleanup";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CHAT_BYTES = 20 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".txt", ".json", ".csv", ".html", ".htm"]);

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

/**
 * Parse-only preview endpoint: accepts a chat file and returns message
 * counts without running AI analysis. The temp file is deleted immediately.
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`upload:${clientIp(req)}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  let tempDir = "";
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
    }
    if (file.size > MAX_CHAT_BYTES) {
      return NextResponse.json(
        { error: "Chat file must be 20 MB or smaller." },
        { status: 413 },
      );
    }
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: "Unsupported file type. Use TXT, JSON, CSV or HTML." },
        { status: 400 },
      );
    }
    const personA = String(form.get("personA") ?? "A").slice(0, 80);
    const personB = String(form.get("personB") ?? "B").slice(0, 80);

    tempDir = await createTempDir();
    const tmpPath = path.join(tempDir, `${randomUUID()}${ext}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tmpPath, buffer);

    const text = buffer.toString("utf8");
    const parsed = parseChat(text, { personA, personB }, file.name);

    return NextResponse.json({
      totalMessages: parsed.messages.length,
      countA: parsed.messages.filter((m) => m.sender === "A").length,
      countB: parsed.messages.filter((m) => m.sender === "B").length,
      countUnknown: parsed.messages.filter((m) => m.sender === "unknown").length,
      format: parsed.format,
      warnings: parsed.warnings,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not read this file. Please check the format and try again." },
      { status: 400 },
    );
  } finally {
    if (tempDir) await cleanupTemporaryFiles(tempDir);
  }
}
