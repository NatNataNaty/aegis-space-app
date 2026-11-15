import { z } from "zod";
import { create } from "zustand";
import { CREW_PROFILE } from "../../data/crew";
import { loadPref, savePref } from "../../lib/storage";
import { enqueueOutboxItem } from "../link/outboxService";

/**
 * Mediciones a mano: lo que el tripulante lee en el tensiómetro, el pulsioxímetro, el termómetro
 * o el glucómetro del botiquín y escribe en la app.
 *
 * Los rangos solo filtran errores de tecleo (valores imposibles para el aparato).
 * NO son umbrales clínicos y no deciden si algo está bien o mal.
 */
export const INPUT_RANGE = {
  systolic: [50, 260],
  diastolic: [30, 160],
  heartRate: [20, 250],
  spo2: [50, 100],
  temperature: [30, 45],
  glucose: [20, 600],
} as const;

export type MeasureField = keyof typeof INPUT_RANGE;
export const MEASURE_FIELDS = Object.keys(INPUT_RANGE) as MeasureField[];

const inRange = (f: MeasureField) => z.number().min(INPUT_RANGE[f][0]).max(INPUT_RANGE[f][1]).optional();

export const measurementSchema = z
  .object({
    systolic: inRange("systolic"),
    diastolic: inRange("diastolic"),
    heartRate: inRange("heartRate"),
    spo2: inRange("spo2"),
    temperature: inRange("temperature"),
    glucose: inRange("glucose"),
    recordedAt: z.number(),
  })
  .refine((m) => MEASURE_FIELDS.some((f) => m[f] !== undefined), { message: "empty" })
  .refine((m) => (m.systolic === undefined) === (m.diastolic === undefined), { message: "pressurePair" })
  .refine((m) => m.systolic === undefined || m.diastolic === undefined || m.systolic > m.diastolic, { message: "pressureOrder" });

export type Measurement = z.infer<typeof measurementSchema>;

/** Convierte lo escrito en el formulario (texto) en una medición validada. Acepta coma decimal. */
export function parseMeasurement(raw: Partial<Record<MeasureField, string>>, recordedAt: number) {
  const values: Record<string, number | undefined> = {};
  for (const f of MEASURE_FIELDS) {
    const s = (raw[f] ?? "").trim().replace(",", ".");
    values[f] = s === "" ? undefined : Number(s);
    if (values[f] !== undefined && Number.isNaN(values[f])) values[f] = Number.POSITIVE_INFINITY;
  }
  return measurementSchema.safeParse({ ...values, recordedAt });
}

/** Lo que viaja a la Tierra (crew_telemetry, kind «manual_measurement»). */
export function buildManualPayload(m: Measurement, crewId: string = CREW_PROFILE.id) {
  return {
    mission_id: "ARES-01",
    crew_id: crewId,
    timestamp: new Date(m.recordedAt).toISOString(),
    heart_rate: m.heartRate ?? null,
    spo2: m.spo2 ?? null,
    raw_data: {
      kind: "manual_measurement",
      blood_pressure: m.systolic !== undefined ? [m.systolic, m.diastolic] : null,
      temperature: m.temperature ?? null,
      glucose_mg_dl: m.glucose ?? null,
    },
  };
}

/** Una medición a mano se muestra en «Tu cuerpo ahora» durante este tiempo. */
export const MANUAL_FRESH_MS = 30 * 60_000;
const KEY = "measurements.v1";

interface MeasurementsState {
  items: Measurement[];
  add: (m: Measurement) => void;
}

export const useMeasurementsStore = create<MeasurementsState>((set, get) => ({
  items: loadPref<Measurement[]>(KEY, []),
  add: (m) => {
    const items = [m, ...get().items].slice(0, 50);
    set({ items });
    savePref(KEY, items);
    void enqueueOutboxItem("crew_telemetry", buildManualPayload(m)).catch(() => undefined);
  },
}));

/** Última medición a mano reciente de un campo, o null. */
export function latestManual(items: Measurement[], field: MeasureField, now: number): { value: number; at: number } | null {
  const m = items.find((x) => x[field] !== undefined);
  if (!m || now - m.recordedAt > MANUAL_FRESH_MS) return null;
  return { value: m[field]!, at: m.recordedAt };
}
