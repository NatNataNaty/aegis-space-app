import { describe, expect, it } from "vitest";
import type { AlertContext } from "../src/features/alerts/alert.types";
import { evaluateAlerts, perclosBaselineStatus } from "../src/features/alerts/alertEngine";
import type { OcularSummary } from "../src/features/camera/camera.types";
import { missionStartMs } from "../src/features/mission/missionClock";
import { generateSnapshot } from "../src/features/simulation/simulation.service";
import type { ScenarioId } from "../src/features/simulation/simulation.types";

function summary(partial: Partial<OcularSummary> = {}): OcularSummary {
  return {
    windowSec: 300,
    blinksPerMin: 15,
    meanBlinkDurationMs: 180,
    perclos: 2,
    prolongedClosures: 0,
    longClosures: 0,
    possibleYawns: 0,
    validCoverage: 0.95,
    quality: "good",
    origin: "camera_live",
    ...partial,
  };
}

function ctx(scenario: ScenarioId, s300: OcularSummary | null, extra: Partial<AlertContext> = {}): AlertContext {
  return {
    camera: {
      active: true,
      calibrated: true,
      frameQuality: "good",
      qualityReasons: [],
      unavailableForMs: 0,
      summary60: s300 ? { ...s300, windowSec: 60 } : null,
      summary300: s300,
      perclosTrend: [],
    },
    sim: generateSnapshot(scenario, missionStartMs(600), 0),
    restPeriod: false,
    blockLabel: "Trabajo",
    selfReport: { fatigue: 2, mood: 4, stress: 2, symptoms: [], recordedAt: 0 },
    ...extra,
  };
}

describe("evaluateAlerts", () => {
  it("does not raise ocular alerts for an isolated closure", () => {
    const alerts = evaluateAlerts(ctx("stable", summary({ longClosures: 1 })));
    expect(alerts.some((a) => a.source === "camera_live" || a.source === "combined")).toBe(false);
  });

  it("raises a camera alert for repeated closures", () => {
    const alerts = evaluateAlerts(ctx("stable", summary({ prolongedClosures: 2, longClosures: 1 })));
    expect(alerts.find((a) => a.id === "repeated_closures")?.source).toBe("camera_live");
  });

  it("combines camera closures with simulated short sleep", () => {
    const alerts = evaluateAlerts(ctx("sleep_deficit", summary({ longClosures: 2 })));
    const combined = alerts.find((a) => a.id === "combined_fatigue");
    expect(combined).toBeDefined();
    expect(combined!.source).toBe("combined");
  });

  it("combined alerts keep the original origin of each signal", () => {
    const alerts = evaluateAlerts(ctx("sleep_deficit", summary({ longClosures: 3 })));
    const combined = alerts.find((a) => a.id === "combined_fatigue")!;
    const origins = new Set(combined.signals.map((s) => s.origin));
    expect(origins).toEqual(new Set(["camera_live", "simulated"]));
    const sleep = combined.signals.find((s) => s.label.startsWith("Sueño"));
    expect(sleep?.origin).toBe("simulated");
  });

  it("does not raise ocular alerts when the capture is not valid", () => {
    const alerts = evaluateAlerts(ctx("sleep_deficit", summary({ longClosures: 5, quality: "unavailable" })));
    expect(alerts.some((a) => a.id === "combined_fatigue" || a.id === "repeated_closures")).toBe(false);
  });

  it("does not treat closed eyes as anomalies during the rest period", () => {
    const alerts = evaluateAlerts(ctx("sleep_deficit", summary({ longClosures: 5 }), { restPeriod: true }));
    expect(alerts.some((a) => a.id === "combined_fatigue" || a.id === "repeated_closures")).toBe(false);
    expect(alerts.some((a) => a.id === "rest_period")).toBe(true);
  });

  it("reports simulated vital variations as simulated", () => {
    const alerts = evaluateAlerts(ctx("physio_variation", summary()));
    const sim = alerts.find((a) => a.id === "sim_vitals");
    expect(sim?.source).toBe("simulated");
    expect(sim?.signals.every((s) => s.origin === "simulated")).toBe(true);
  });
});

describe("perclosBaselineStatus", () => {
  it("detects consecutive windows above the personal reference", () => {
    const trend = [2, 2.5, 2, 12, 14].map((p, i) => ({ t: i * 60_000, perclos: p }));
    const status = perclosBaselineStatus(trend);
    expect(status.baseline).toBe(2);
    expect(status.elevatedWindows).toBe(2);
  });

  it("ignores invalid windows", () => {
    const trend = [2, null, 2, null].map((p, i) => ({ t: i * 60_000, perclos: p }));
    expect(perclosBaselineStatus(trend).baseline).toBeNull();
  });
});
