import type { ChatMessage } from "@/types/chat";
import type { ConversationStats } from "@/types/analysis-stats";
import { clamp } from "@/lib/utils";

const INITIATION_GAP_MS = 6 * 60 * 60 * 1000; // a new thread after 6h of silence
const MAX_REPLY_GAP_MS = 24 * 60 * 60 * 1000;

interface TimestampedMessage {
  msg: ChatMessage;
  time: number;
}

function withTimestamps(messages: ChatMessage[]): TimestampedMessage[] {
  const out: TimestampedMessage[] = [];
  for (const msg of messages) {
    if (!msg.timestamp) continue;
    const time = Date.parse(msg.timestamp);
    if (!Number.isNaN(time)) out.push({ msg, time });
  }
  out.sort((a, b) => a.time - b.time);
  return out;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : (sorted[mid] ?? 0);
}

/** Compute deterministic conversation statistics used by prompts and scoring fallbacks. */
export function computeStats(messages: ChatMessage[]): ConversationStats {
  const totalMessages = messages.length;
  const countA = messages.filter((m) => m.sender === "A").length;
  const countB = messages.filter((m) => m.sender === "B").length;
  const countUnknown = totalMessages - countA - countB;
  const attributed = countA + countB;

  const lenA = messages.filter((m) => m.sender === "A").map((m) => m.content.length);
  const lenB = messages.filter((m) => m.sender === "B").map((m) => m.content.length);
  const avg = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length);
  const questionRatio = (sender: "A" | "B") => {
    const list = messages.filter((m) => m.sender === sender);
    if (list.length === 0) return 0;
    return list.filter((m) => /[?？]/.test(m.content)).length / list.length;
  };

  const ts = withTimestamps(messages);
  let initiationRatioA = 0.5;
  let initiationRatioB = 0.5;
  let medianReplyMs: number | null = null;
  let activeDays = 0;
  if (ts.length > 0) {
    let initA = 0;
    let initB = 0;
    let prevTime: number | null = null;
    const replyGaps: number[] = [];
    const days = new Set<string>();
    let prevSender: ChatMessage["sender"] | null = null;
    for (const { msg, time } of ts) {
      days.add(new Date(time).toISOString().slice(0, 10));
      if (prevTime === null || time - prevTime > INITIATION_GAP_MS) {
        if (msg.sender === "A") initA++;
        else if (msg.sender === "B") initB++;
      } else if (
        prevSender !== null &&
        prevSender !== msg.sender &&
        (prevSender === "A" || prevSender === "B") &&
        (msg.sender === "A" || msg.sender === "B")
      ) {
        const gap = time - prevTime;
        if (gap >= 0 && gap <= MAX_REPLY_GAP_MS) replyGaps.push(gap);
      }
      prevTime = time;
      prevSender = msg.sender;
    }
    const totalInit = initA + initB;
    if (totalInit > 0) {
      initiationRatioA = initA / totalInit;
      initiationRatioB = initB / totalInit;
    }
    medianReplyMs = median(replyGaps);
    activeDays = days.size;
  }

  return {
    totalMessages,
    countA,
    countB,
    countUnknown,
    shareA: attributed > 0 ? countA / attributed : 0,
    shareB: attributed > 0 ? countB / attributed : 0,
    avgLengthA: Math.round(avg(lenA) * 10) / 10,
    avgLengthB: Math.round(avg(lenB) * 10) / 10,
    questionRatioA: Math.round(questionRatio("A") * 1000) / 1000,
    questionRatioB: Math.round(questionRatio("B") * 1000) / 1000,
    initiationRatioA: Math.round(initiationRatioA * 1000) / 1000,
    initiationRatioB: Math.round(initiationRatioB * 1000) / 1000,
    medianReplyMs,
    activeDays,
    totalChars: messages.reduce((s, m) => s + m.content.length, 0),
  };
}

function formatLatency(ms: number | null): string {
  if (ms === null) return "unknown (no usable timestamps)";
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "under a minute";
  if (minutes < 60) return `about ${minutes} minute(s)`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `about ${hours} hour(s)`;
  return `about ${Math.round(hours / 24)} day(s)`;
}

/** Render deterministic stats as a prompt section for the AI. */
export function statsToPromptText(
  stats: ConversationStats,
  personA: string,
  personB: string,
): string {
  const lines = [
    `Total messages: ${stats.totalMessages} (${personA}: ${stats.countA}, ${personB}: ${stats.countB}, unattributed: ${stats.countUnknown})`,
    `Message share — ${personA}: ${(stats.shareA * 100).toFixed(1)}%, ${personB}: ${(stats.shareB * 100).toFixed(1)}%`,
    `Average message length — ${personA}: ${stats.avgLengthA} chars, ${personB}: ${stats.avgLengthB} chars`,
    `Question ratio — ${personA}: ${(stats.questionRatioA * 100).toFixed(1)}%, ${personB}: ${(stats.questionRatioB * 100).toFixed(1)}%`,
    `Conversation initiation — ${personA}: ${(stats.initiationRatioA * 100).toFixed(1)}%, ${personB}: ${(stats.initiationRatioB * 100).toFixed(1)}%`,
    `Median reply latency: ${formatLatency(stats.medianReplyMs)}`,
    `Active days with messages: ${stats.activeDays}`,
  ];
  if (stats.countUnknown > 0) {
    lines.push(
      `Note: ${stats.countUnknown} message(s) could not be attributed to either person; treat them cautiously.`,
    );
  }
  return lines.join("\n");
}

/** Balance penalty 0..1: 0 = perfectly balanced, 1 = one-sided. */
export function balancePenalty(shareA: number, shareB: number): number {
  return clamp(Math.abs(shareA - shareB), 0, 1);
}
