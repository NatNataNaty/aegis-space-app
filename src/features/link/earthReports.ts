import { activeCrew } from "../../data/crew";
import { useCameraStore } from "../../stores/camera.store";
import { useHealthStore } from "../../stores/health.store";
import { useLinkStore } from "../../stores/linkStore";
import type { Alert, SelfReport } from "../alerts/alert.types";
import { lightFor, type Light } from "../alerts/triage";
import type { OcularSummary } from "../camera/camera.types";
import { toMissionTime } from "../mission/missionClock";
import type { SimSnapshot } from "../simulation/simulation.types";
import { enqueueOutboxItem, initOutboxAutoSync, outboxDb, pruneSyncedItems, type OutboxItem } from "./outboxService";
import { syncOutboxBatch } from "./syncService";

/**
 * Reportes de cada tripulante hacia la Tierra.
 *
 * Todo se escribe primero a bordo (bandeja de salida en IndexedDB) y sale solo cuando hay enlace,
 * con el retardo Luna/Marte. La nave nunca espera respuesta: si no hay enlace, los reportes se
 * acumulan y viajan en el siguiente contacto.
 *
 * Nunca viajan: fotos, vídeo, puntos del rostro, la plantilla de identificación facial ni el PIN.
 */

export const MISSION_ID = "ARES-01";
/** Resumen de signos cada minuto real. */
export const SUMMARY_EVERY_MS = 60_000;
/** Cada cuánto se intenta vaciar la bandeja si el enlace está activo. */
export const SYNC_EVERY_MS = 10_000;
const PRUNE_EVERY_MS = 60 * 60_000;
/** Un cambio de semáforo debe mantenerse este tiempo antes de viajar. */
const LIGHT_SETTLE_MS = 4_000;

export type ReportKind = "minute_summary" | "self_report";

/** Nivel con el que viaja un cambio de semáforo en alerts_log. */
const LIGHT_LEVEL: Record<Light, "info" | "caution" | "warning"> = { green: "info", yellow: "caution", red: "warning" };

const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

/** Resumen de un minuto: solo números y estado. Función pura (se prueba sin navegador). */
export function buildMinuteSummary(
  snap: SimSnapshot,
  ocular: OcularSummary | null,
  light: Light,
  crewId: string = activeCrew().id,
  at: number = Date.now(),
) {
  const v = snap.vitals;
  return {
    mission_id: MISSION_ID,
    crew_id: crewId,
    timestamp: new Date(at).toISOString(),
    heart_rate: Math.round(v.heartRate.value),
    spo2: Math.round(v.spo2.value),
    perclos: ocular?.perclos ?? null,
    radiation_dose: round(snap.exposure.totalMsv, 2),
    raw_data: {
      kind: "minute_summary" satisfies ReportKind,
      light,
      mission_day: toMissionTime(snap.missionMs).day,
      blood_pressure: [Math.round(v.bloodPressure.value), Math.round(v.bloodPressure.value2 ?? 0)],
      temperature: round(v.temperature.value),
      glucose_mg_dl: Math.round(v.glucose.value),
      resp_rate: Math.round(v.respRate.value),
      sleep_last_night_h: round(snap.sleep.lastNightHours),
      exercise_today_min: Math.round(snap.activity.exerciseTodayMin),
      radiation_daily_msv: round(snap.exposure.dailyMsv, 3),
      camera_quality: ocular?.quality ?? null,
    },
  };
}

/** «Cómo me siento»: escalas y síntomas marcados por el propio tripulante. */
export function buildSelfReport(report: SelfReport, crewId: string = activeCrew().id) {
  return {
    mission_id: MISSION_ID,
    crew_id: crewId,
    timestamp: new Date(report.recordedAt).toISOString(),
    raw_data: {
      kind: "self_report" satisfies ReportKind,
      fatigue: report.fatigue,
      mood: report.mood,
      stress: report.stress,
      symptoms: [...report.symptoms],
    },
  };
}

/** Cambio de semáforo (verde → amarillo → rojo…) para que la Tierra vea la evolución. */
export function buildLightChange(light: Light, top: Alert | undefined, crewId: string = activeCrew().id, at: number = Date.now()) {
  return {
    mission_id: MISSION_ID,
    alert_id: top?.id ?? `triage_${light}`,
    crew_id: crewId,
    level: LIGHT_LEVEL[light],
    title: `triage_${light}`,
    description: top ? `${top.title} · protocol=${top.protocolId ?? "-"}` : null,
    timestamp: new Date(at).toISOString(),
  };
}

/** Últimos reportes de la bandeja (enviados o en cola), del más nuevo al más viejo. */
export async function recentReports(limit = 12): Promise<OutboxItem[]> {
  if (typeof indexedDB === "undefined") return [];
  return outboxDb.outbox.orderBy("created_at").reverse().limit(limit).toArray();
}

const topAlert = (alerts: Alert[]) => alerts.find((a) => a.level !== "info");

/**
 * Arranca el envío periódico. Devuelve la función para detenerlo.
 * Errores aislados nunca rompen la app: se quedan en la bandeja para el siguiente intento.
 */
export function startEarthLink(): () => void {
  const safe = (p: Promise<unknown>) => void p.catch(() => undefined);
  const stopAutoSync = initOutboxAutoSync();

  const enqueueSummary = () => {
    const health = useHealthStore.getState();
    const cam = useCameraStore.getState();
    const ocular = cam.status === "active" ? cam.summary60 : null;
    safe(enqueueOutboxItem("crew_telemetry", buildMinuteSummary(health.snapshot, ocular, lightFor(topAlert(health.activeAlerts)?.level ?? null))));
  };

  // Primer resumen al abrir, luego uno por minuto.
  enqueueSummary();
  const summaryId = window.setInterval(enqueueSummary, SUMMARY_EVERY_MS);
  const syncId = window.setInterval(() => safe(syncOutboxBatch()), SYNC_EVERY_MS);
  const pruneId = window.setInterval(() => safe(pruneSyncedItems()), PRUNE_EVERY_MS);

  // Cada autoevaluación guardada viaja como reporte propio.
  const stopSelf = useHealthStore.subscribe((s, prev) => {
    if (s.selfReport && s.selfReport !== prev.selfReport) safe(enqueueOutboxItem("crew_telemetry", buildSelfReport(s.selfReport)));
  });

  // Cada cambio de color del semáforo viaja a alerts_log.
  let lastLight: Light = lightFor(topAlert(useHealthStore.getState().activeAlerts)?.level ?? null);
  let pendingLight: Light | null = null;
  let lightTimer: number | undefined;
  const stopLight = useHealthStore.subscribe((s) => {
    if (!s.alertsEvaluated) return;
    const top = topAlert(s.activeAlerts);
    const light = lightFor(top?.level ?? null);
    if (light === lastLight || light === pendingLight) return;
    // Solo viaja un color que se mantiene unos segundos: evita parpadeos al cambiar de escenario.
    pendingLight = light;
    window.clearTimeout(lightTimer);
    lightTimer = window.setTimeout(() => {
      pendingLight = null;
      const now = topAlert(useHealthStore.getState().activeAlerts);
      if (lightFor(now?.level ?? null) !== light || light === lastLight) return;
      lastLight = light;
      safe(enqueueOutboxItem("alerts_log", buildLightChange(light, now)));
    }, LIGHT_SETTLE_MS);
  });

  // Al reactivar el enlace (o cambiar el retardo), se intenta de inmediato.
  const stopLink = useLinkStore.subscribe((s, prev) => {
    if (s.isLinkActive && (!prev.isLinkActive || s.delayMode !== prev.delayMode)) safe(syncOutboxBatch());
  });

  return () => {
    stopAutoSync();
    window.clearInterval(summaryId);
    window.clearInterval(syncId);
    window.clearInterval(pruneId);
    stopSelf();
    stopLight();
    window.clearTimeout(lightTimer);
    stopLink();
  };
}
