import { describe, expect, it } from "vitest";
import { fitWithin, MAX_DIMENSION } from "@/lib/compress-image";

describe("fitWithin", () => {
  it("leaves small images untouched (never upscales)", () => {
    expect(fitWithin(800, 600, MAX_DIMENSION)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(MAX_DIMENSION, MAX_DIMENSION, MAX_DIMENSION)).toEqual({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
    });
  });

  it("scales the long edge down to maxDim, keeping aspect ratio", () => {
    // 4000x3000 phone photo -> 1280x960
    expect(fitWithin(4000, 3000, MAX_DIMENSION)).toEqual({ width: 1280, height: 960 });
    // portrait 3000x4000 -> 960x1280
    expect(fitWithin(3000, 4000, MAX_DIMENSION)).toEqual({ width: 960, height: 1280 });
  });

  it("handles degenerate input without NaN", () => {
    const r = fitWithin(0, 0, MAX_DIMENSION);
    expect(Number.isFinite(r.width)).toBe(true);
    expect(Number.isFinite(r.height)).toBe(true);
  });
});
