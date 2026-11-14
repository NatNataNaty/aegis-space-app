import { describe, expect, it } from "vitest";
import { missionStartMs } from "../src/features/mission/missionClock";
import { SCENARIO_ORDER, SCENARIOS } from "../src/features/simulation/scenarios";
import { generateSnapshot } from "../src/features/simulation/simulation.service";

const T = missionStartMs(SCENARIOS.stable.startMinute);

describe("simulation", () => {
  it("is reproducible for the same scenario and mission time", () => {
    const a = generateSnapshot("sleep_deficit", T, 0);
    const b = generateSnapshot("sleep_deficit", T, 0);
    expect(a).toEqual(b);
  });

  it("marks every vital as simulated", () => {
    for (const id of SCENARIO_ORDER) {
      const snap = generateSnapshot(id, T, 0);
      expect(snap.origin).toBe("simulated");
      for (const v of Object.values(snap.vitals)) expect(v.origin).toBe("simulated");
    }
  });

  it("changing scenario only changes simulated data", () => {
    const stable = generateSnapshot("stable", T, 0);
    const deficit = generateSnapshot("sleep_deficit", T, 0);
    expect(deficit.sleep.lastNightHours).toBeLessThan(stable.sleep.lastNightHours);
    expect(Object.keys(deficit)).toEqual(Object.keys(stable));
    expect(JSON.stringify(deficit)).not.toContain("camera_live");
  });

  it("produces 24 h history and 7-day trends", () => {
    const snap = generateSnapshot("stable", T, 0);
    expect(snap.history24h).toHaveLength(48);
    expect(snap.trend7d).toHaveLength(7);
  });

  it("physiological variation scenario flags simulated variations", () => {
    const snap = generateSnapshot("physio_variation", T, 0);
    const statuses = Object.values(snap.vitals).map((v) => v.status);
    expect(statuses).toContain("variation");
  });
});
