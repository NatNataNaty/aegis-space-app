import { describe, expect, it } from "vitest";
import { checkEarthLink, isSupabaseConfigured } from "../src/features/link/supabaseClient";
import { enqueueOutboxItem, getOutboxStats, outboxDb } from "../src/features/link/outboxService";

describe("Earth Link & Outbox Service", () => {
  it("degrades gracefully when Supabase is not configured in local environment", async () => {
    // En entorno de test sin variables .env reales
    const configured = isSupabaseConfigured();
    expect(typeof configured).toBe("boolean");

    const status = await checkEarthLink(500);
    expect(status).toBeDefined();
    expect(typeof status.online).toBe("boolean");
    expect(status.lastChecked).toBeDefined();
  });

  it("enqueues telemetry in outbox offline queue", async () => {
    // Si IndexedDB está disponible en el entorno jsdom
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

      // Limpieza
      await outboxDb.outbox.delete(id);
    }
  });
});
