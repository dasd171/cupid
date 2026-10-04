import type { AIAnalysis, ScoreKey } from "@/types/analysis";
import type { ConversationStats } from "@/types/analysis-stats";
import { balancePenalty } from "./analyzer";
import { clamp } from "@/lib/utils";

/** Spec §9 weights. */
export const SCORE_WEIGHTS: Record<ScoreKey, number> = {
  communication: 0.2,
  emotionalEngagement: 0.2,
  mutualInterest: 0.2,
  consistency: 0.15,
  conflictResolution: 0.15,
  futureOrientation: 0.1,
};

export const SCORE_KEYS: ScoreKey[] = [
  "communication",
  "emotionalEngagement",
  "mutualInterest",
  "consistency",
  "conflictResolution",
  "futureOrientation",
];

export interface ScoredResult {
  scores: Record<ScoreKey, number>;
  overall: number;
  /** Dimensions that used the rule-based fallback instead of the AI. */
  fallbackDimensions: ScoreKey[];
}

/**
 * Rule-based fallback for a dimension the AI did not score.
 * Deliberately conservative (centred near 50) and fully deterministic.
 */
export function ruleBasedFallback(key: ScoreKey, stats: ConversationStats): number {
  const penalty = balancePenalty(stats.shareA, stats.shareB);
  switch (key) {
    case "communication": {
      let score = 55;
      if (stats.medianReplyMs !== null) {
        if (stats.medianReplyMs < 60 * 60 * 1000) score += 12;
        else if (stats.medianReplyMs < 6 * 60 * 60 * 1000) score += 6;
        else if (stats.medianReplyMs > 24 * 60 * 60 * 1000) score -= 10;
      }
      score += (stats.questionRatioA + stats.questionRatioB > 0.4 ? 6 : 0);
      score -= penalty * 25;
      return clamp(Math.round(score), 5, 95);
    }
    case "emotionalEngagement": {
      let score = 52;
      const avgLen = (stats.avgLengthA + stats.avgLengthB) / 2;
      if (avgLen > 60) score += 8;
      else if (avgLen > 25) score += 4;
      if (stats.questionRatioA + stats.questionRatioB > 0.5) score += 6;
      score -= penalty * 20;
      return clamp(Math.round(score), 5, 95);
    }
    case "mutualInterest": {
      const initGap = Math.abs(stats.initiationRatioA - stats.initiationRatioB);
      let score = 68 - initGap * 60 - penalty * 20;
      return clamp(Math.round(score), 5, 95);
    }
    case "consistency": {
      const score = 40 + Math.min(stats.activeDays, 25) * 2;
      return clamp(Math.round(score), 5, 95);
    }
    case "conflictResolution":
      // Not detectable deterministically; stay neutral.
      return 55;
    case "futureOrientation":
      // Requires semantic understanding; stay neutral.
      return 50;
  }
}

/**
 * Merge AI sub-scores with rule-based fallbacks, then compute the
 * weighted overall score per spec §9.
 */
export function finalizeScores(ai: AIAnalysis, stats: ConversationStats): ScoredResult {
  const scores = {} as Record<ScoreKey, number>;
  const fallbackDimensions: ScoreKey[] = [];
  for (const key of SCORE_KEYS) {
    const aiValue = ai.scores[key];
    if (typeof aiValue === "number" && Number.isFinite(aiValue)) {
      scores[key] = clamp(Math.round(aiValue), 0, 100);
    } else {
      scores[key] = ruleBasedFallback(key, stats);
      fallbackDimensions.push(key);
    }
  }
  const overall = Math.round(
    SCORE_KEYS.reduce((sum, key) => sum + scores[key] * SCORE_WEIGHTS[key], 0),
  );
  return { scores, overall: clamp(overall, 0, 100), fallbackDimensions };
}
