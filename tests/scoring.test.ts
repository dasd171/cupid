import { describe, expect, it } from "vitest";
import {
  SCORE_KEYS,
  SCORE_WEIGHTS,
  finalizeScores,
  ruleBasedFallback,
} from "@/lib/analysis/scoring";
import type { AIAnalysis } from "@/types/analysis";
import type { ConversationStats } from "@/types/analysis-stats";

function makeStats(overrides: Partial<ConversationStats> = {}): ConversationStats {
  return {
    totalMessages: 100,
    countA: 55,
    countB: 45,
    countUnknown: 0,
    shareA: 0.55,
    shareB: 0.45,
    avgLengthA: 40,
    avgLengthB: 38,
    questionRatioA: 0.3,
    questionRatioB: 0.28,
    initiationRatioA: 0.6,
    initiationRatioB: 0.4,
    medianReplyMs: 30 * 60 * 1000,
    activeDays: 12,
    totalChars: 3900,
    ...overrides,
  };
}

function makeAI(overrides: Partial<AIAnalysis> = {}): AIAnalysis {
  return {
    overallScore: 78,
    direction: "potential_romantic",
    confidence: "medium",
    summary: "Mutual interest with some ambiguity.",
    scores: {
      communication: 85,
      emotionalEngagement: 80,
      mutualInterest: 78,
      consistency: 72,
      conflictResolution: 65,
      futureOrientation: 70,
    },
    positiveSignals: ["a"],
    riskSignals: ["b"],
    evidence: [],
    recommendations: ["c"],
    ...overrides,
  };
}

describe("scoring", () => {
  it("weights sum to 1", () => {
    const sum = SCORE_KEYS.reduce((s, k) => s + SCORE_WEIGHTS[k], 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it("computes the weighted overall from AI sub-scores", () => {
    const result = finalizeScores(makeAI(), makeStats());
    // 85*.2 + 80*.2 + 78*.2 + 72*.15 + 65*.15 + 70*.1 = 76.15 → 76
    expect(result.overall).toBe(76);
    expect(result.fallbackDimensions).toHaveLength(0);
    expect(result.scores.communication).toBe(85);
  });

  it("falls back to rule-based estimates for missing dimensions", () => {
    const ai = makeAI({ scores: { communication: 90 } });
    const result = finalizeScores(ai, makeStats());
    expect(result.fallbackDimensions).toContain("emotionalEngagement");
    expect(result.fallbackDimensions).toContain("futureOrientation");
    expect(result.fallbackDimensions).not.toContain("communication");
    expect(result.fallbackDimensions).toHaveLength(5);
    expect(result.scores.communication).toBe(90);
  });

  it("fallback scores stay within 0-100 and are deterministic", () => {
    const stats = makeStats();
    for (const key of SCORE_KEYS) {
      const a = ruleBasedFallback(key, stats);
      const b = ruleBasedFallback(key, stats);
      expect(a).toBe(b);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(100);
    }
  });

  it("rewards balanced, responsive conversations in the communication fallback", () => {
    const balanced = ruleBasedFallback(
      "communication",
      makeStats({ shareA: 0.5, shareB: 0.5, medianReplyMs: 5 * 60 * 1000 }),
    );
    const oneSided = ruleBasedFallback(
      "communication",
      makeStats({ shareA: 0.95, shareB: 0.05, medianReplyMs: 30 * 60 * 60 * 1000 }),
    );
    expect(balanced).toBeGreaterThan(oneSided);
  });
});
