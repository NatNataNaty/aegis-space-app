import { describe, expect, it } from "vitest";
import { buildManualPayload, latestManual, MANUAL_FRESH_MS, parseMeasurement } from "../src/features/measurements/measurements";
import { crewTelemetryPayloadSchema } from "../src/features/link/syncService";

describe("mediciones a mano", () => {
  it("acepta coma decimal y campos sueltos", () => {
    const r = parseMeasurement({ temperature: "36,8", glucose: "95" }, 1);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toMatchObject({ temperature: 36.8, glucose: 95 });
  });

  it("rechaza formulario vacío, presión incompleta o invertida y valores imposibles", () => {
    expect(parseMeasurement({}, 1).error?.issues[0].message).toBe("empty");
    expect(parseMeasurement({ systolic: "120" }, 1).error?.issues[0].message).toBe("pressurePair");
    expect(parseMeasurement({ systolic: "70", diastolic: "120" }, 1).error?.issues[0].message).toBe("pressureOrder");
    expect(parseMeasurement({ spo2: "140" }, 1).success).toBe(false);
    expect(parseMeasurement({ glucose: "abc" }, 1).success).toBe(false);
  });

  it("viaja a la Tierra con un formato que la Tierra acepta", () => {
    const r = parseMeasurement({ systolic: "118", diastolic: "76", glucose: "98" }, 0);
    expect(r.success).toBe(true);
    if (!r.success) return;
    const p = buildManualPayload(r.data);
    expect(p.raw_data).toMatchObject({ kind: "manual_measurement", blood_pressure: [118, 76], glucose_mg_dl: 98 });
    expect(crewTelemetryPayloadSchema.safeParse(p).success).toBe(true);
  });

  it("una medición a mano solo se muestra mientras es reciente", () => {
    const items = [{ glucose: 98, recordedAt: 0 }];
    expect(latestManual(items, "glucose", 1000)?.value).toBe(98);
    expect(latestManual(items, "glucose", MANUAL_FRESH_MS + 1)).toBeNull();
    expect(latestManual(items, "spo2", 1000)).toBeNull();
  });
});
