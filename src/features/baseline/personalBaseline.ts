import { create } from "zustand";
import { loadPref, savePref } from "../../lib/storage";
import type { SimSnapshot } from "../simulation/simulation.types";

/**
 * Línea base personal que aprende con cada lectura (plan maestro: «Mejora de la IA a bordo»).
 *
 * - Por señal guarda solo estadísticos agregados: número de lecturas, media y varianza
 *   (algoritmo de Welford con olvido exponencial: lo reciente pesa más, ventana efectiva ≈ 200 lecturas).
 * - Solo aprende de lecturas estables: una anomalía no se vuelve «lo normal».
 * - Sirve para explicar («lo normal para ti es 61») y para la confianza del mensaje.
 *   NO cambia los umbrales de las alertas: nunca supera los límites fijos del motor de reglas.
 * - Los datos de origen son sintéticos (escenarios deterministas); la línea base se adapta a ellos.
 */

export type BaselineSignal = "heartRate" | "spo2" | "temperature" | "sleepHours";

export interface SignalStats {
  n: number;
  mean: number;
  m2: number;
}

export type BaselineState = Record<BaselineSignal, SignalStats>;

/** Ventana efectiva: a partir de aquí cada lectura nueva pesa 1/MAX_WEIGHT. */
export const MAX_WEIGHT = 200;
/** Lecturas a partir de las cuales la línea base se considera fiable. */
export const RELIABLE_N = 60;

export const emptyStats = (): SignalStats => ({ n: 0, mean: 0, m2: 0 });

/** Actualización incremental (Welford con olvido): pura y determinista. */
export function updateStats(s: SignalStats, x: number): SignalStats {
  if (!Number.isFinite(x)) return s;
  const n = s.n + 1;
  const w = 1 / Math.min(n, MAX_WEIGHT);
  const delta = x - s.mean;
  const mean = s.mean + w * delta;
  // Varianza exponencialmente ponderada (equivale a Welford mientras n ≤ MAX_WEIGHT).
  const m2 = (1 - w) * (s.m2 + w * delta * delta);
  return { n, mean, m2 };
}

export const stdDev = (s: SignalStats) => (s.n < 2 ? null : Math.sqrt(Math.max(0, s.m2)));

export function confidence(s: SignalStats): "none" | "learning" | "reliable" {
  if (s.n === 0) return "none";
  return s.n >= RELIABLE_N ? "reliable" : "learning";
}

const PREF_KEY = "baseline.v1";
const SIGNALS: BaselineSignal[] = ["heartRate", "spo2", "temperature", "sleepHours"];

const initial = (): BaselineState => {
  const saved = loadPref<Partial<BaselineState> | null>(PREF_KEY, null);
  return Object.fromEntries(SIGNALS.map((k) => [k, saved?.[k] ?? emptyStats()])) as BaselineState;
};

interface BaselineStore {
  stats: BaselineState;
  lastRecordedAt: number;
  lastSleepDay: number | null;
  learn: (snap: SimSnapshot, missionDay: number) => void;
  reset: () => void;
}

export const useBaselineStore = create<BaselineStore>((set, get) => ({
  stats: initial(),
  lastRecordedAt: 0,
  lastSleepDay: null,
  learn: (snap, missionDay) => {
    const { stats, lastRecordedAt, lastSleepDay } = get();
    if (snap.missionMs === lastRecordedAt) return;
    // Solo se aprende de lecturas estables: la línea base describe lo normal, no las anomalías.
    const learnIfStable = (st: SignalStats, v: { value: number; status: string }) =>
      v.status === "stable" ? updateStats(st, v.value) : st;
    let heartRate = stats.heartRate;
    // Primera vez: el pulso en reposo de los últimos 7 días da un punto de partida.
    if (heartRate.n === 0) for (const d of snap.trend7d) heartRate = updateStats(heartRate, d.restingHr);
    let next: BaselineState = {
      ...stats,
      heartRate: learnIfStable(heartRate, snap.vitals.heartRate),
      spo2: learnIfStable(stats.spo2, snap.vitals.spo2),
      temperature: learnIfStable(stats.temperature, snap.vitals.temperature),
    };
    // Primera vez: arranca con las 7 noches del historial para no empezar en blanco.
    if (stats.sleepHours.n === 0) {
      let sleep = emptyStats();
      for (const d of snap.trend7d) sleep = updateStats(sleep, d.sleepHours);
      next = { ...next, sleepHours: sleep };
    }
    // El sueño se aprende una vez por día de misión.
    let sleepDay = lastSleepDay;
    if (lastSleepDay !== missionDay && stats.sleepHours.n > 0) {
      next = { ...next, sleepHours: updateStats(next.sleepHours, snap.sleep.lastNightHours) };
      sleepDay = missionDay;
    }
    set({ stats: next, lastRecordedAt: snap.missionMs, lastSleepDay: sleepDay ?? missionDay });
    savePref(PREF_KEY, next);
  },
  reset: () => {
    const stats = Object.fromEntries(SIGNALS.map((k) => [k, emptyStats()])) as BaselineState;
    set({ stats, lastRecordedAt: 0, lastSleepDay: null });
    savePref(PREF_KEY, stats);
  },
}));
