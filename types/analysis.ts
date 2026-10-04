import { z } from "zod";

/** Relationship direction verdicts. Must stay in sync with the prompt templates. */
export const DirectionSchema = z.enum([
  "romantic",
  "potential_romantic",
  "friendship",
  "unclear",
  "cooling_down",
]);
export type RelationshipDirection = z.infer<typeof DirectionSchema>;

export const ConfidenceSchema = z.enum(["low", "medium", "high"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const EvidenceItemSchema = z.object({
  type: z.string().min(1).max(80),
  description: z.string().min(1).max(600),
  claim: z.string().max(400).optional(),
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

const ScoreDimensionSchema = z.number().min(0).max(100);

/** Structured JSON the AI must return. Validated strictly with this schema. */
export const AIAnalysisSchema = z.object({
  overallScore: ScoreDimensionSchema,
  direction: DirectionSchema,
  confidence: ConfidenceSchema,
  summary: z.string().min(1).max(3000),
  scores: z
    .object({
      communication: ScoreDimensionSchema,
      emotionalEngagement: ScoreDimensionSchema,
      mutualInterest: ScoreDimensionSchema,
      consistency: ScoreDimensionSchema,
      conflictResolution: ScoreDimensionSchema,
      futureOrientation: ScoreDimensionSchema,
    })
    .partial(),
  positiveSignals: z.array(z.string().min(1).max(400)).max(20).default([]),
  riskSignals: z.array(z.string().min(1).max(400)).max(20).default([]),
  evidence: z.array(EvidenceItemSchema).max(40).default([]),
  recommendations: z.array(z.string().min(1).max(400)).max(20).default([]),
});
export type AIAnalysis = z.infer<typeof AIAnalysisSchema>;

export type ScoreKey =
  | "communication"
  | "emotionalEngagement"
  | "mutualInterest"
  | "consistency"
  | "conflictResolution"
  | "futureOrientation";

/** Claims the model must never make. Checked before schema validation. */
const BANNED_CLAIMS = [
  "100% certain",
  "100 percent certain",
  "will definitely get married",
  "definitely become a couple",
  "this person is your soulmate",
  "your soulmate",
  "guaranteed",
];

export function containsBannedClaim(text: string): boolean {
  const lowered = text.toLowerCase();
  return BANNED_CLAIMS.some((phrase) => lowered.includes(phrase));
}

/**
 * Extract the first JSON object from raw model output (tolerates code fences
 * and surrounding prose), then validate it strictly against AIAnalysisSchema.
 * Throws a descriptive Error when anything is off.
 */
export function parseAIResponse(raw: string): AIAnalysis {
  if (containsBannedClaim(raw)) {
    throw new Error("AI output contained a disallowed certainty claim.");
  }
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI output did not contain a JSON object.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    throw new Error("AI output was not valid JSON.");
  }
  const result = AIAnalysisSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(`AI output failed schema validation: ${issues}`);
  }
  if (containsBannedClaim(JSON.stringify(result.data))) {
    throw new Error("AI output contained a disallowed certainty claim.");
  }
  return result.data;
}

/** Final report served to the result page. */
export interface FinalReport {
  id: string;
  createdAt: string;
  personA: string;
  personB: string;
  stats: import("./analysis-stats").ConversationStats;
  /** Weighted overall score (0-100). AI-generated heuristic, not a prediction. */
  overallScore: number;
  scores: Record<ScoreKey, number>;
  /** Dimensions filled by rule-based fallback instead of the AI. */
  fallbackDimensions: ScoreKey[];
  direction: RelationshipDirection;
  directionLabel: string;
  confidence: Confidence;
  summary: string;
  positiveSignals: string[];
  riskSignals: string[];
  evidence: EvidenceItem[];
  recommendations: string[];
  visualContext?: string;
}

export const DIRECTION_LABELS: Record<RelationshipDirection, string> = {
  romantic: "Likely romantic",
  potential_romantic: "Potential romantic relationship",
  friendship: "More like friendship",
  unclear: "Unclear for now",
  cooling_down: "Cooling down",
};
