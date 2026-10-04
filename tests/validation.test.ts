import { describe, expect, it } from "vitest";
import { parseAIResponse } from "@/types/analysis";

const VALID = JSON.stringify({
  overallScore: 78,
  direction: "potential_romantic",
  confidence: "medium",
  summary: "The conversation shows mutual interest and emotional engagement, but the relationship remains ambiguous.",
  scores: {
    communication: 85,
    emotionalEngagement: 80,
    mutualInterest: 78,
    consistency: 72,
    conflictResolution: 65,
    futureOrientation: 70,
  },
  positiveSignals: ["Both people frequently initiate conversations"],
  riskSignals: ["Initiation is slightly unbalanced"],
  evidence: [
    {
      type: "mutual_interest",
      description: "Both participants repeatedly ask follow-up questions.",
    },
  ],
  recommendations: ["Spend more time together offline"],
});

describe("parseAIResponse", () => {
  it("accepts a valid AI JSON payload", () => {
    const result = parseAIResponse(VALID);
    expect(result.overallScore).toBe(78);
    expect(result.direction).toBe("potential_romantic");
    expect(result.scores.communication).toBe(85);
  });

  it("tolerates markdown code fences around the JSON", () => {
    const result = parseAIResponse("```json\n" + VALID + "\n```");
    expect(result.overallScore).toBe(78);
  });

  it("rejects non-JSON output", () => {
    expect(() => parseAIResponse("I think they like each other a lot!")).toThrow(
      /JSON/,
    );
  });

  it("rejects out-of-range scores", () => {
    const bad = JSON.stringify({
      ...JSON.parse(VALID),
      overallScore: 150,
    });
    expect(() => parseAIResponse(bad)).toThrow(/validation/i);
  });

  it("rejects unknown direction values", () => {
    const bad = JSON.stringify({
      ...JSON.parse(VALID),
      direction: "married_next_week",
    });
    expect(() => parseAIResponse(bad)).toThrow();
  });

  it("rejects disallowed certainty claims", () => {
    const bad = JSON.stringify({
      ...JSON.parse(VALID),
      summary: "I am 100% certain you will definitely get married.",
    });
    expect(() => parseAIResponse(bad)).toThrow(/disallowed/i);
  });

  it("rejects soulmate claims", () => {
    const bad = JSON.stringify({
      ...JSON.parse(VALID),
      recommendations: ["This person is your soulmate, propose now"],
    });
    expect(() => parseAIResponse(bad)).toThrow(/disallowed/i);
  });

  it("applies defaults for optional arrays", () => {
    const minimal = JSON.stringify({
      overallScore: 50,
      direction: "unclear",
      confidence: "low",
      summary: "Not enough evidence.",
      scores: {},
    });
    const result = parseAIResponse(minimal);
    expect(result.positiveSignals).toEqual([]);
    expect(result.evidence).toEqual([]);
  });
});
