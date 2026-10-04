"use client";

import { motion } from "framer-motion";
import type { ScoreKey } from "@/types/analysis";

interface CompatibilityChartProps {
  scores: Record<ScoreKey, number>;
  fallbackDimensions: ScoreKey[];
}

const ROWS: Array<{ key: ScoreKey; label: string }> = [
  { key: "communication", label: "Communication" },
  { key: "emotionalEngagement", label: "Emotional Engagement" },
  { key: "mutualInterest", label: "Mutual Interest" },
  { key: "consistency", label: "Consistency" },
  { key: "conflictResolution", label: "Conflict Resolution" },
  { key: "futureOrientation", label: "Future Orientation" },
];

/** Animated per-dimension bars. */
export function CompatibilityChart({ scores, fallbackDimensions }: CompatibilityChartProps) {
  return (
    <div className="space-y-4">
      {ROWS.map((row, i) => {
        const value = scores[row.key];
        const isFallback = fallbackDimensions.includes(row.key);
        return (
          <div key={row.key}>
            <div className="mb-1.5 flex items-baseline justify-between text-sm">
              <span className="font-medium">
                {row.label}
                {isFallback && (
                  <span
                    className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-normal text-muted-foreground"
                    title="The AI did not score this dimension, so a conservative rule-based estimate was used."
                  >
                    estimated
                  </span>
                )}
              </span>
              <span className="font-bold tabular-nums">{value}</span>
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={value}
              aria-label={row.label}
            >
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-600"
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                transition={{ duration: 1, delay: 0.4 + i * 0.12, ease: "easeOut" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
