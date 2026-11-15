import { describe, expect, it } from "vitest";
import { confidence, emptyStats, MAX_WEIGHT, RELIABLE_N, stdDev, updateStats } from "../src/features/baseline/personalBaseline";

describe("línea base personal", () => {
  it("la media converge al valor habitual y la variación es la real", () => {
    let s = emptyStats();
    for (let i = 0; i < 100; i++) s = updateStats(s, i % 2 === 0 ? 58 : 62);
    expect(s.mean).toBeCloseTo(60, 0);
    expect(stdDev(s)!).toBeGreaterThan(1.5);
    expect(stdDev(s)!).toBeLessThan(2.5);
  });

  it("se adapta con el tiempo: lo reciente pesa más que lo antiguo", () => {
    let s = emptyStats();
    for (let i = 0; i < MAX_WEIGHT; i++) s = updateStats(s, 60);
    for (let i = 0; i < MAX_WEIGHT; i++) s = updateStats(s, 70);
    expect(s.mean).toBeGreaterThan(66);
  });

  it("ignora valores no numéricos y marca la confianza", () => {
    let s = updateStats(emptyStats(), Number.NaN);
    expect(s.n).toBe(0);
    expect(confidence(s)).toBe("none");
    s = updateStats(s, 60);
    expect(confidence(s)).toBe("learning");
    for (let i = 0; i < RELIABLE_N; i++) s = updateStats(s, 60);
    expect(confidence(s)).toBe("reliable");
  });
});

describe("línea base: aprende solo de lo normal", () => {
  it("una lectura anómala no mueve lo normal", async () => {
    const { useBaselineStore } = await import("../src/features/baseline/personalBaseline");
    const { generateSnapshot } = await import("../src/features/simulation/simulation.service");
    useBaselineStore.getState().reset();
    const calm = generateSnapshot("stable", 142 * 86400000 + 9.6 * 3600000, 0);
    useBaselineStore.getState().learn(calm, 142);
    const before = useBaselineStore.getState().stats.heartRate.mean;
    const odd = generateSnapshot("physio_variation", 142 * 86400000 + 9.7 * 3600000, 0);
    expect(odd.vitals.heartRate.status).not.toBe("stable");
    useBaselineStore.getState().learn(odd, 142);
    expect(useBaselineStore.getState().stats.heartRate.mean).toBe(before);
  });
});
