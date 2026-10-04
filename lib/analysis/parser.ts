import type { ChatMessage, ChatSender, ParsedChat } from "@/types/chat";

export interface ParseOptions {
  personA?: string;
  personB?: string;
  /** Safety cap; excess messages are dropped with a warning. */
  maxMessages?: number;
}

const DEFAULT_MAX_MESSAGES = 20_000;
const MAX_MESSAGE_CHARS = 4000;

/** WhatsApp-style: `[12/08/2026, 20:30] Alice: hello` or `12-08-2026 20:30 - Alice: hi` */
const WHATSAPP_RE =
  /^\[?(\d{1,4}[\/\-.]\d{1,2}[\/\-.]\d{1,4}(?:[,\s]+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)?)\]?\s*(?:[–—-]\s*)?([^:：]{1,60})[:：]\s?(.*)$/;
/** Plain `Alice: hello` lines (name may contain CJK characters). */
const SIMPLE_RE =
  /^([A-Za-z\u4e00-\u9fa5][\w\u4e00-\u9fa5 .'\-]{0,40})[:：]\s+(.*)$/;

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function resolveSender(raw: string, options: ParseOptions): ChatSender {
  const name = normalizeName(raw);
  if (!name) return "unknown";
  const a = normalizeName(options.personA ?? "");
  const b = normalizeName(options.personB ?? "");
  if (a && (name === a || name.includes(a) || a.includes(name))) return "A";
  if (b && (name === b || name.includes(b) || b.includes(name))) return "B";
  if (name === "a" || name === "person a") return "A";
  if (name === "b" || name === "person b") return "B";
  return "unknown";
}

function pushMessage(
  messages: ChatMessage[],
  sender: ChatSender,
  timestamp: string | undefined,
  content: string,
  maxMessages: number,
  warnings: string[],
): void {
  const text = content.trim().slice(0, MAX_MESSAGE_CHARS);
  if (!text) return;
  if (messages.length >= maxMessages) {
    if (!warnings.includes("message-cap")) {
      warnings.push(
        `Message cap reached (${maxMessages}); remaining messages were dropped.`,
      );
    }
    return;
  }
  const msg: ChatMessage = { sender, content: text };
  if (timestamp && !Number.isNaN(Date.parse(timestamp))) msg.timestamp = timestamp;
  messages.push(msg);
}

export function detectFormat(content: string, filename?: string): ParsedChat["format"] {
  const trimmed = content.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch {
      // fall through to content sniffing
    }
  }
  const lowerName = (filename ?? "").toLowerCase();
  if (lowerName.endsWith(".html") || lowerName.endsWith(".htm")) return "html";
  if (lowerName.endsWith(".csv")) return "csv";
  if (lowerName.endsWith(".json")) return "txt";
  const head = trimmed.slice(0, 2000);
  if (/<\s*(html|div|table|body)\b/i.test(head)) return "html";
  const firstLine = trimmed.split("\n", 1)[0] ?? "";
  if (
    firstLine.includes(",") &&
    /sender|speaker|name|author|from/i.test(firstLine) &&
    /content|text|message|body/i.test(firstLine)
  ) {
    return "csv";
  }
  return "txt";
}

/* ── JSON ─────────────────────────────────────────────────────────── */

function parseJson(content: string, options: ParseOptions): ParsedChat {
  const warnings: string[] = [];
  const messages: ChatMessage[] = [];
  const maxMessages = options.maxMessages ?? DEFAULT_MAX_MESSAGES;
  let root: unknown;
  try {
    root = JSON.parse(content);
  } catch {
    throw new Error("Chat file is not valid JSON.");
  }
  const items: unknown[] = Array.isArray(root)
    ? root
    : typeof root === "object" && root !== null
      ? ((root as Record<string, unknown>).messages as unknown[]) ??
        ((root as Record<string, unknown>).data as unknown[]) ??
        []
      : [];
  if (!Array.isArray(items)) throw new Error("Chat JSON has no message array.");
  for (const item of items) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    const rawSender = String(
      rec.sender ?? rec.name ?? rec.author ?? rec.speaker ?? rec.from ?? rec.role ?? "",
    );
    const rawContent = rec.content ?? rec.text ?? rec.message ?? rec.body ?? "";
    const rawTime = rec.timestamp ?? rec.time ?? rec.date ?? rec.datetime ?? rec.created_at;
    pushMessage(
      messages,
      resolveSender(rawSender, options),
      typeof rawTime === "string" ? rawTime : undefined,
      String(rawContent ?? ""),
      maxMessages,
      warnings,
    );
  }
  if (messages.length === 0) warnings.push("No messages could be extracted from the JSON file.");
  return { messages, format: "json", warnings };
}

/* ── CSV ──────────────────────────────────────────────────────────── */

function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

function parseCsv(content: string, options: ParseOptions): ParsedChat {
  const warnings: string[] = [];
  const messages: ChatMessage[] = [];
  const maxMessages = options.maxMessages ?? DEFAULT_MAX_MESSAGES;
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) throw new Error("CSV file is empty.");
  const header = splitCsvLine(lines[0] ?? "").map((h) => h.toLowerCase());
  const senderIdx = header.findIndex((h) => /sender|speaker|name|author|from/.test(h));
  const contentIdx = header.findIndex((h) => /content|text|message|body/.test(h));
  const timeIdx = header.findIndex((h) => /time|date/.test(h));
  const hasHeader = senderIdx !== -1 && contentIdx !== -1;
  const startRow = hasHeader ? 1 : 0;
  const sIdx = hasHeader ? senderIdx : 0;
  const cIdx = hasHeader ? contentIdx : 1;
  const tIdx = hasHeader ? timeIdx : -1;
  for (let i = startRow; i < lines.length; i++) {
    const fields = splitCsvLine(lines[i] ?? "");
    const rawSender = fields[sIdx] ?? "";
    const rawContent = fields[cIdx] ?? fields.slice(1).join(",") ?? "";
    const rawTime = tIdx >= 0 ? fields[tIdx] : undefined;
    pushMessage(
      messages,
      resolveSender(rawSender, options),
      rawTime,
      rawContent,
      maxMessages,
      warnings,
    );
  }
  if (messages.length === 0) warnings.push("No messages could be extracted from the CSV file.");
  return { messages, format: "csv", warnings };
}

/* ── HTML ─────────────────────────────────────────────────────────── */

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/** Telegram desktop HTML export pattern. */
function parseTelegramHtml(html: string, options: ParseOptions): ParsedChat | null {
  const warnings: string[] = [];
  const messages: ChatMessage[] = [];
  const maxMessages = options.maxMessages ?? DEFAULT_MAX_MESSAGES;
  const blocks = html.match(/<div class="message default[^"]*"[\s\S]*?(?=<div class="message default|$)/g);
  if (!blocks || blocks.length === 0) return null;
  for (const block of blocks) {
    const nameMatch = block.match(/<div class="from_name">\s*([\s\S]*?)\s*<\/div>/);
    const textMatch = block.match(/<div class="text">\s*([\s\S]*?)\s*<\/div>/);
    const dateMatch = block.match(/title="(\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}:\d{2})"/);
    if (!textMatch) continue;
    const strip = (s: string) =>
      decodeEntities(s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).trim();
    pushMessage(
      messages,
      resolveSender(nameMatch ? strip(nameMatch[1] ?? "") : "", options),
      dateMatch?.[1],
      strip(textMatch[1] ?? ""),
      maxMessages,
      warnings,
    );
  }
  if (messages.length === 0) return null;
  return { messages, format: "html", warnings };
}

function parseHtml(content: string, options: ParseOptions): ParsedChat {
  const telegram = parseTelegramHtml(content, options);
  if (telegram) return telegram;
  // Generic fallback: strip tags, then parse the remaining text as txt.
  const text = decodeEntities(
    content
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(div|p|tr|li|h\d)>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  );
  const parsed = parseTxt(text, options);
  parsed.format = "html";
  parsed.warnings.unshift("Generic HTML export: tags were stripped and lines parsed as plain text.");
  return parsed;
}

/* ── TXT / pasted text ────────────────────────────────────────────── */

function parseTxt(content: string, options: ParseOptions): ParsedChat {
  const warnings: string[] = [];
  const messages: ChatMessage[] = [];
  const maxMessages = options.maxMessages ?? DEFAULT_MAX_MESSAGES;
  const lines = content.split(/\r?\n/);
  let unattributed = 0;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const wa = line.match(WHATSAPP_RE);
    if (wa) {
      pushMessage(messages, resolveSender(wa[2] ?? "", options), wa[1], wa[3] ?? "", maxMessages, warnings);
      continue;
    }
    const simple = line.match(SIMPLE_RE);
    if (simple && (simple[1] ?? "").length <= 40) {
      pushMessage(messages, resolveSender(simple[1] ?? "", options), undefined, simple[2] ?? "", maxMessages, warnings);
      continue;
    }
    // Continuation of the previous message.
    const last = messages[messages.length - 1];
    if (last) {
      last.content = `${last.content}\n${line}`.slice(0, MAX_MESSAGE_CHARS);
    } else {
      unattributed++;
    }
  }
  if (unattributed > 0) {
    warnings.push(`${unattributed} line(s) before the first attributed message were skipped.`);
  }
  if (messages.length === 0) {
    warnings.push("No messages could be parsed. Try the JSON/CSV format or paste lines like “Name: message”.");
  }
  return { messages, format: "txt", warnings };
}

/* ── Entry point ──────────────────────────────────────────────────── */

/**
 * Parse chat content (file text or pasted text) into the canonical
 * ChatMessage list. Never throws for partially-bad input — problems are
 * reported via `warnings` — except for structurally invalid JSON/empty CSV.
 */
export function parseChat(
  content: string,
  options: ParseOptions = {},
  filename?: string,
): ParsedChat {
  const text = content.replace(/^\uFEFF/, "");
  if (!text.trim()) {
    return { messages: [], format: "txt", warnings: ["Chat input was empty."] };
  }
  const format = detectFormat(text, filename);
  switch (format) {
    case "json":
      return parseJson(text, options);
    case "csv":
      return parseCsv(text, options);
    case "html":
      return parseHtml(text, options);
    case "txt":
    default:
      return parseTxt(text, options);
  }
}
