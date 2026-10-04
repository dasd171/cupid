import { randomUUID } from "crypto";
import type { FinalReport } from "@/types/analysis";

/**
 * Report store.
 *
 * Default (STORE_ANALYSIS=false): reports live ONLY in process memory with a
 * 10-minute TTL, and are never written to disk. This is documented in the
 * README. The STORE_ANALYSIS flag is reserved for a future persistent
 * backend and currently has no effect.
 */

const TTL_MS = 10 * 60 * 1000;

interface Entry {
  report: FinalReport;
  expiresAt: number;
}

const reports = new Map<string, Entry>();

function sweepExpired(): void {
  const now = Date.now();
  for (const [id, entry] of reports) {
    if (entry.expiresAt <= now) reports.delete(id);
  }
}

// Periodic sweep; unref'd so it never keeps the process alive on its own.
const timer = setInterval(sweepExpired, 60_000);
if (typeof timer.unref === "function") timer.unref();

/** Save a report, returning its random public id. */
export function saveReport(report: Omit<FinalReport, "id">): string {
  sweepExpired();
  const id = randomUUID();
  reports.set(id, { report: { ...report, id }, expiresAt: Date.now() + TTL_MS });
  return id;
}

/** Fetch a report by id, or undefined when missing/expired. */
export function getReport(id: string): FinalReport | undefined {
  const entry = reports.get(id);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    reports.delete(id);
    return undefined;
  }
  return entry.report;
}

/** Remaining lifetime in ms (for debugging / headers). */
export function reportTtlMs(): number {
  return TTL_MS;
}
