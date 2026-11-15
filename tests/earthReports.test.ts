import "fake-indexeddb/auto";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import i18n from "../src/i18n";
import type { AlertContext } from "../src/features/alerts/alert.types";
import { evaluateAlerts } from "../src/features/alerts/alertEngine";
import { lightFor } from "../src/features/alerts/triage";
import { buildLightChange, buildMinuteSummary, buildSelfReport, recentReports } from "../src/features/link/earthReports";
import { enqueueOutboxItem, getOutboxStats, outboxDb } from "../src/features/link/outboxService";
import { crewTelemetryPayloadSchema, alertsLogPayloadSchema, syncOutboxBatch } from "../src/features/link/syncService";
import { missionStartMs } from "../src/features/mission/missionClock";
import { generateSnapshot } from "../src/features/simulation/simulation.service";
import { PROTOCOLS } from "../src/lib/content";
import { useLinkStore } from "../src/stores/linkStore";

const snap = generateSnapshot("stable", missionStartMs(600), 0);

function ctx(symptoms: string[]): AlertContext {
  return {
    evaluatedAt: 1000,
    camera: { active: false, calibrated: false, frameQuality: null, qualityReasons: [], unavailableForMs: 0, summary60: null, summary300: null, perclosTrend: [] },
    sim: snap,
    restPeriod: false,
    blockLabel: "Trabajo",
    selfReport: { fatigue: 2, mood: 4, stress: 2, symptoms, recordedAt: 1000 },
  };
}

beforeAll(async () => {
  await i18n.changeLanguage("es");
});

describe("semáforo", () => {
  it("traduce el nivel del motor a verde, amarillo y rojo", () => {
    expect(lightFor(null)).toBe("green");
    expect(lightFor("info")).toBe("green");
    expect(lightFor("watch")).toBe("yellow");
    expect(lightFor("attention")).toBe("red");
  });

  it("dolor de pecho es rojo, abre su protocolo y avisa al compañero al instante", () => {
    const a = evaluateAlerts(ctx(["headache", "chestPain"])).find((x) => x.id === "self_symptoms")!;
    expect(lightFor(a.level)).toBe("red");
    expect(a.protocolId).toBe("dolor-pecho-respirar");
    expect(a.askForHelp).toBe(true);
    expect(a.buddyAfterSec).toBe(0);
  });

  it("el protocolo nuevo sigue pendiente de revisión médica", () => {
    const p = PROTOCOLS.find((x) => x.id === "dolor-pecho-respirar")!;
    expect(p.reviewStatus).toBe("pendiente");
    expect([...p.solo, ...p.withBuddy].every((s) => s.reviewStatus === "pendiente")).toBe(true);
  });
});

describe("reportes a la Tierra", () => {
  it("el resumen por minuto lleva tripulante y signos, y pasa la validación de la Tierra", () => {
    const p = buildMinuteSummary(snap, null, "green", "AR1-002", 0);
    expect(p.crew_id).toBe("AR1-002");
    expect(typeof p.heart_rate).toBe("number");
    expect(p.raw_data.kind).toBe("minute_summary");
    expect(crewTelemetryPayloadSchema.safeParse(p).success).toBe(true);
  });

  it("nunca incluye imagen, rostro, plantilla ni PIN", () => {
    const text = JSON.stringify([
      buildMinuteSummary(snap, null, "red"),
      buildSelfReport({ fatigue: 3, mood: 3, stress: 3, symptoms: ["chestPain"], recordedAt: 0 }),
    ]).toLowerCase();
    for (const banned of ["image", "photo", "frame", "landmark", "template", "pin", "name"]) expect(text).not.toContain(`"${banned}`);
  });

  it("el cambio de semáforo viaja con un nivel que acepta alerts_log", () => {
    expect(alertsLogPayloadSchema.safeParse(buildLightChange("red", undefined)).success).toBe(true);
    expect(buildLightChange("yellow", undefined).level).toBe("caution");
  });
});

describe("bandeja de salida sin enlace", () => {
  beforeEach(async () => {
    await outboxDb.outbox.clear();
  });

  it("sin enlace los reportes se acumulan a bordo y no se pierden", async () => {
    useLinkStore.getState().setLinkActive(false);
    await enqueueOutboxItem("crew_telemetry", buildMinuteSummary(snap, null, "green"));
    await enqueueOutboxItem("crew_telemetry", buildSelfReport({ fatigue: 2, mood: 4, stress: 1, symptoms: [], recordedAt: 0 }));
    const r = await syncOutboxBatch();
    expect(r.processed).toBe(0);
    expect((await getOutboxStats()).pending).toBe(2);
    expect(useLinkStore.getState().pendingCount).toBe(2);
    const recent = await recentReports();
    expect(recent).toHaveLength(2);
  });
});
