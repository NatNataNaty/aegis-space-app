import { describe, expect, it } from "vitest";
import { checkEarthLink, isSupabaseConfigured } from "../src/features/link/supabaseClient";
import { enqueueOutboxItem, getOutboxStats, outboxDb } from "../src/features/link/outboxService";
import {
  simulateTransmissionDelay,
  validatePayload,
  fetchMissionOverview,
  sendGroundNote,
} from "../src/features/link/syncService";
import { useLinkStore, DELAY_MS } from "../src/stores/linkStore";

describe("Earth Link & Outbox Service", () => {
  it("degrades gracefully when Supabase is not configured or offline", async () => {
    const configured = isSupabaseConfigured();
    expect(typeof configured).toBe("boolean");

    const status = await checkEarthLink(500);
    expect(status).toBeDefined();
    expect(typeof status.online).toBe("boolean");
    expect(status.lastChecked).toBeDefined();
  });

  it("enqueues telemetry in outbox offline queue", async () => {
    if (typeof indexedDB !== "undefined") {
      const id = await enqueueOutboxItem("crew_telemetry", {
        mission_id: "ARES-01",
        crew_id: "CDR-VASQUEZ",
        heart_rate: 72,
        spo2: 98,
        perclos: 1.2,
      });

      expect(id).toBeGreaterThan(0);

      const stats = await getOutboxStats();
      expect(stats.total).toBeGreaterThanOrEqual(1);

      await outboxDb.outbox.delete(id);
    }
  });
});

describe("Link Store & Transmission Delay Simulation", () => {
  it("manages delay modes correctly (none: 0s, moon: 3s, mars: 15s)", () => {
    const store = useLinkStore.getState();
    expect(DELAY_MS.none).toBe(0);
    expect(DELAY_MS.moon).toBe(3000);
    expect(DELAY_MS.mars).toBe(15000);

    store.setDelayMode("moon");
    expect(useLinkStore.getState().delayMode).toBe("moon");
    expect(useLinkStore.getState().getDelayMs()).toBe(3000);

    store.setDelayMode("mars");
    expect(useLinkStore.getState().delayMode).toBe("mars");
    expect(useLinkStore.getState().getDelayMs()).toBe(15000);

    store.setDelayMode("none");
    expect(useLinkStore.getState().getDelayMs()).toBe(0);
  });

  it("simulates transmission delay asynchronously without throwing", async () => {
    const start = performance.now();
    await simulateTransmissionDelay(40);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(30);
  });
});

describe("Zod Validation for Earth Payloads", () => {
  it("validates valid crew telemetry payload", () => {
    const valid = {
      mission_id: "ARES-01",
      crew_id: "MO-CHEN",
      heart_rate: 68,
      spo2: 99,
      perclos: 0.8,
    };
    const res = validatePayload("crew_telemetry", valid);
    expect(res.success).toBe(true);
  });

  it("rejects crew telemetry payload without crew_id", () => {
    const invalid = {
      mission_id: "ARES-01",
      crew_id: "",
    };
    const res = validatePayload("crew_telemetry", invalid);
    expect(res.success).toBe(false);
  });

  it("validates alerts_log and rejects invalid severity levels", () => {
    const validAlert = {
      mission_id: "ARES-01",
      alert_id: "ALT-001",
      level: "warning",
      title: "Desaturación de oxígeno leve",
    };
    expect(validatePayload("alerts_log", validAlert).success).toBe(true);

    const invalidAlert = {
      ...validAlert,
      level: "catastrophic", // no permitido
    };
    expect(validatePayload("alerts_log", invalidAlert).success).toBe(false);
  });

  it("validates protocol_runs default review_status is 'pendiente'", () => {
    const validProtocol = {
      mission_id: "ARES-01",
      protocol_id: "PROTO-HYPOXIA-01",
      protocol_title: "Manejo de Hipoxia Aguda en EVA",
      crew_id: "CDR-VASQUEZ",
    };
    const res = validatePayload("protocol_runs", validProtocol);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.review_status).toBe("pendiente");
    }
  });

  it("validates ground_notes payload schema", () => {
    const validNote = {
      mission_id: "ARES-01",
      author_role: "Flight Surgeon",
      title: "Autorización de EVA",
      note: "Condiciones biomédicas aptas para actividad extravehicular.",
      priority: "normal",
    };
    expect(validatePayload("ground_notes", validNote).success).toBe(true);
  });
});

describe("Mission Overview & Ground Notes API", () => {
  it("without a link, the /control overview reports no Earth data instead of made-up numbers", async () => {
    const overview = await fetchMissionOverview();
    expect(overview).toBeDefined();
    // Sin enlace no se inventan cifras: null significa «sin datos de la Tierra».
    expect(overview.telemetryCount === null || overview.telemetryCount >= 0).toBe(true);
    expect(overview.alertsCount === null || overview.alertsCount >= 0).toBe(true);
    expect(overview.protocolsCount === null || overview.protocolsCount >= 0).toBe(true);
    if (!overview.isConfigured) expect([overview.telemetryCount, overview.alertsCount, overview.protocolsCount]).toEqual([null, null, null]);
    expect(Array.isArray(overview.recentNotes)).toBe(true);
  });

  it("sends ground note via outbox queue", async () => {
    if (typeof indexedDB !== "undefined") {
      const res = await sendGroundNote({
        title: "Test Note",
        note: "Directriz de prueba",
        priority: "low",
      });
      expect(res.success).toBe(true);
      expect(res.id).toBeDefined();
    }
  });
});
