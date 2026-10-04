import {
  DIRECTION_LABELS,
  type AIAnalysis,
  type FinalReport,
} from "@/types/analysis";
import type { ConversationStats } from "@/types/analysis-stats";
import type { ScoredResult } from "./scoring";

export interface BuildReportInput {
  personA: string;
  personB: string;
  stats: ConversationStats;
  ai: AIAnalysis;
  scored: ScoredResult;
  visualContext?: string;
}

/** Assemble the final report object served to the result page. */
export function buildFinalReport(input: BuildReportInput): Omit<FinalReport, "id"> {
  return {
    createdAt: new Date().toISOString(),
    personA: input.personA,
    personB: input.personB,
    stats: input.stats,
    overallScore: input.scored.overall,
    scores: input.scored.scores,
    fallbackDimensions: input.scored.fallbackDimensions,
    direction: input.ai.direction,
    directionLabel: DIRECTION_LABELS[input.ai.direction],
    confidence: input.ai.confidence,
    summary: input.ai.summary,
    positiveSignals: input.ai.positiveSignals,
    riskSignals: input.ai.riskSignals,
    evidence: input.ai.evidence,
    recommendations: input.ai.recommendations,
    visualContext: input.visualContext,
  };
}
