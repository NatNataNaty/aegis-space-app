import { describe, expect, it } from "vitest";
import { computePerclos, type PerclosSample } from "../src/features/camera/perclos";

const CONFIG = { minRunMs: 400, minValidMs: 1000, minCoverage: 0.5 };
const DT = 50;

function samples(pattern: ("o" | "c" | "x")[]): PerclosSample[] {
  return pattern.map((p, i) => ({
    timestampMs: (i + 1) * DT,
    dtMs: DT,
    valid: p !== "x",
    nearlyClosed: p === "c",
  }));
}

const rep = (ch: "o" | "c" | "x", n: number) => Array<"o" | "c" | "x">(n).fill(ch);

describe("computePerclos", () => {
  it("computes the percentage for a sequence with known closed time", () => {
    // 10 s total: 1 s closed (20 frames), 9 s open.
    const s = samples([...rep("o", 90), ...rep("c", 20), ...rep("o", 90)]);
    const r = computePerclos(s, 200 * DT, 10_000, CONFIG);
    expect(r.closedMs).toBe(1000);
    expect(r.validMs).toBe(10_000);
    expect(r.perclos).toBeCloseTo(10, 5);
  });

  it("excludes short runs (ordinary blinks)", () => {
    const s = samples([...rep("o", 50), ...rep("c", 4), ...rep("o", 50)]);
    const r = computePerclos(s, 104 * DT, 10_000, CONFIG);
    expect(r.closedMs).toBe(0);
    expect(r.perclos).toBe(0);
  });

  it("invalid frames are excluded from numerator and denominator", () => {
    const s = samples([...rep("o", 40), ...rep("x", 100), ...rep("c", 20), ...rep("o", 40)]);
    const r = computePerclos(s, 200 * DT, 10_000, CONFIG);
    expect(r.validMs).toBe(100 * DT);
    expect(r.closedMs).toBe(20 * DT);
    expect(r.perclos).toBeCloseTo(20, 5);
  });

  it("returns null instead of 0 without enough valid coverage", () => {
    const s = samples([...rep("x", 180), ...rep("o", 10)]);
    const r = computePerclos(s, 190 * DT, 10_000, CONFIG);
    expect(r.perclos).toBeNull();
  });
});
