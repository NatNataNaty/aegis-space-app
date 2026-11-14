import { median } from "../camera/eyeAspectRatio";
import type { VitalId } from "../simulation/simulation.types";
import type { Alert, AlertContext, AlertSignal, PerclosPoint } from "./alert.types";
import { ALERT_CONFIG, DISCLAIMER, LEVEL_ORDER } from "./alertRules";

const VITAL_LABEL: Record<VitalId, string> = {
  heartRate: "Frecuencia cardíaca",
  bloodPressure: "Presión arterial",
  spo2: "SpO₂",
  respRate: "Frecuencia respiratoria",
  temperature: "Temperatura",
  glucose: "Glucosa",
};

const fmt = (v: number, d = 0) => v.toLocaleString("es-ES", { maximumFractionDigits: d, minimumFractionDigits: d });

export interface PerclosBaselineStatus {
  baseline: number | null;
  elevatedWindows: number;
  latest: number | null;
}

/**
 * Uses non-overlapping 60 s windows: the first valid ones form the personal reference,
 * later consecutive windows above reference + margin count as elevated.
 */
export function perclosBaselineStatus(trend: readonly PerclosPoint[]): PerclosBaselineStatus {
  const windows: number[] = [];
  let lastT = -Infinity;
  for (const p of trend) {
    if (p.perclos === null) continue;
    if (p.t - lastT >= ALERT_CONFIG.perclosWindowSpacingMs) {
      windows.push(p.perclos);
      lastT = p.t;
    }
  }

  const n = ALERT_CONFIG.perclosBaselineWindows;
  if (windows.length < n) return { baseline: null, elevatedWindows: 0, latest: windows.at(-1) ?? null };

  const baseline = median(windows.slice(0, n)) ?? 0;
  const threshold = Math.max(
    baseline + ALERT_CONFIG.perclosMarginPoints,
    baseline * ALERT_CONFIG.perclosMarginRatio,
  );
  let elevated = 0;
  for (let i = windows.length - 1; i >= n; i--) {
    if (windows[i] > threshold) elevated++;
    else break;
  }
  return { baseline, elevatedWindows: elevated, latest: windows.at(-1) ?? null };
}

function closureSignals(ctx: AlertContext): AlertSignal[] {
  const s = ctx.camera.summary300;
  if (!s) return [];
  return [
    { label: "Cierres prolongados (400–499 ms)", value: String(s.prolongedClosures), origin: "camera_live" },
    { label: "Cierres largos (≥ 500 ms)", value: String(s.longClosures), origin: "camera_live" },
    {
      label: "PERCLOS 5 min",
      value: s.perclos === null ? "No disponible" : `${fmt(s.perclos, 1)} %`,
      origin: "camera_live",
    },
  ];
}

/** Pure function: same context → same alerts. Never rewrites the origin of a signal. */
export function evaluateAlerts(ctx: AlertContext): Alert[] {
  const alerts: Alert[] = [];
  const cam = ctx.camera;
  const s300 = cam.summary300;
  const cameraUsable = cam.active && cam.calibrated && s300 !== null && s300.quality !== "unavailable";
  const closures = s300 ? s300.prolongedClosures + s300.longClosures : 0;
  const sleepHours = ctx.sim.sleep.lastNightHours;
  const sleepShort = sleepHours < ALERT_CONFIG.insufficientSleepHours;

  if (cam.active && cam.frameQuality === "unavailable" && cam.unavailableForMs >= ALERT_CONFIG.cameraUnavailableMs) {
    alerts.push({
      id: "camera_unavailable",
      title: "Medición ocular no disponible",
      level: "info",
      source: "camera_live",
      observed: cam.qualityReasons.length
        ? `${cam.qualityReasons.join(", ")}. No se emiten alertas oculares con frames no válidos.`
        : "No se detecta el rostro o los ojos. No se emiten alertas oculares.",
      signals: [{ label: "Calidad de captura", value: "No disponible", origin: "camera_live" }],
      window: `${Math.round(cam.unavailableForMs / 1000)} s sin datos válidos`,
      quality: "unavailable",
      action: "Colócate frente a la cámara con iluminación suficiente o recalibra.",
      disclaimer: DISCLAIMER,
    });
  }

  if (ctx.restPeriod) {
    alerts.push({
      id: "rest_period",
      title: "Periodo de descanso programado",
      level: "info",
      source: "simulated",
      observed: "La misión simulada está en ventana de descanso. Los ojos cerrados no se clasifican como anomalía y la cámara no mide sueño.",
      signals: [{ label: "Bloque del horario", value: ctx.blockLabel, origin: "simulated" }],
      window: "Horario de misión",
      quality: null,
      action: "Respetar la ventana de descanso.",
      disclaimer: DISCLAIMER,
    });
  }

  const combined =
    !ctx.restPeriod && cameraUsable && closures >= ALERT_CONFIG.combinedClosures && sleepShort;

  if (combined) {
    alerts.push({
      id: "combined_fatigue",
      title: "Señales compatibles con fatiga en este escenario de demo",
      level: "attention",
      source: "combined",
      observed: `La cámara registró ${closures} cierres prolongados o largos en 5 min y el escenario simula ${fmt(sleepHours, 1)} h de sueño.`,
      signals: [
        ...closureSignals(ctx),
        { label: "Sueño último ciclo", value: `${fmt(sleepHours, 1)} h`, origin: "simulated" },
        { label: "Bloque actual", value: ctx.blockLabel, origin: "simulated" },
      ],
      window: "Últimos 5 min (cámara) · último ciclo de sueño (simulado)",
      quality: s300?.quality ?? null,
      action: "Realizar una pausa, revisar el estado de alerta y priorizar el próximo descanso programado.",
      disclaimer: DISCLAIMER,
    });
  } else if (!ctx.restPeriod && cameraUsable && closures >= ALERT_CONFIG.repeatedClosures) {
    alerts.push({
      id: "repeated_closures",
      title: "Revisar nivel de alerta",
      level: "watch",
      source: "camera_live",
      observed: `Se registraron ${closures} cierres prolongados o largos durante la sesión de trabajo.`,
      signals: closureSignals(ctx),
      window: "Últimos 5 min",
      quality: s300?.quality ?? null,
      action: "Realizar una pausa breve y revisar el estado de alerta.",
      disclaimer: DISCLAIMER,
    });
  }

  const perclos = perclosBaselineStatus(cam.perclosTrend);
  if (!ctx.restPeriod && cam.active && perclos.elevatedWindows >= ALERT_CONFIG.perclosElevatedWindows) {
    alerts.push({
      id: "perclos_above_baseline",
      title: "Aumento de cierres oculares respecto a tu referencia",
      level: "watch",
      source: "camera_live",
      observed: `PERCLOS por encima de tu referencia personal en ${perclos.elevatedWindows} ventanas consecutivas de 1 min.`,
      signals: [
        { label: "Referencia personal", value: `${fmt(perclos.baseline ?? 0, 1)} %`, origin: "camera_live" },
        { label: "Última ventana", value: `${fmt(perclos.latest ?? 0, 1)} %`, origin: "camera_live" },
      ],
      window: `${perclos.elevatedWindows} ventanas de 60 s`,
      quality: cam.summary60?.quality ?? null,
      action: "Realizar una pausa y revisar el descanso.",
      disclaimer: DISCLAIMER,
    });
  }

  const vitals = Object.values(ctx.sim.vitals);
  const varied = vitals.filter((v) => v.status === "variation");
  const watched = vitals.filter((v) => v.status === "watch");
  if (varied.length || watched.length >= 2) {
    const list = [...varied, ...watched];
    alerts.push({
      id: "sim_vitals",
      title: "Variación en datos simulados",
      level: varied.length ? "attention" : "watch",
      source: "simulated",
      observed: `${list.map((v) => VITAL_LABEL[v.id]).join(", ")} fuera del perfil de demostración. No representa una urgencia médica real.`,
      signals: list.map((v) => ({
        label: VITAL_LABEL[v.id],
        value:
          v.id === "bloodPressure" ? `${v.value}/${v.value2} ${v.unit}` : `${fmt(v.value, v.id === "temperature" ? 1 : 0)} ${v.unit}`,
        origin: "simulated" as const,
      })),
      window: "Lectura actual del escenario",
      quality: null,
      action: "En una situación real, seguir el protocolo médico de la misión y contactar al personal sanitario.",
      disclaimer: DISCLAIMER,
    });
  }

  if (sleepShort && !combined) {
    alerts.push({
      id: "sim_sleep",
      title: "Sueño simulado reducido",
      level: "watch",
      source: "simulated",
      observed: `El escenario simula ${fmt(sleepHours, 1)} h de sueño en el último ciclo (media 7 días: ${fmt(ctx.sim.sleep.avg7d, 1)} h).`,
      signals: [
        { label: "Sueño último ciclo", value: `${fmt(sleepHours, 1)} h`, origin: "simulated" },
        { label: "Regularidad", value: `${ctx.sim.sleep.regularity} %`, origin: "simulated" },
      ],
      window: "Últimos 7 ciclos",
      quality: null,
      action: "Recordar el horario de descanso de la misión.",
      disclaimer: DISCLAIMER,
    });
  }

  const report = ctx.selfReport;
  if (report && report.symptoms.length) {
    alerts.push({
      id: "self_symptoms",
      title: "Síntomas reportados",
      level: "attention",
      source: "user_reported",
      observed: `Reportaste: ${report.symptoms.join(", ")}.`,
      signals: report.symptoms.map((s) => ({ label: "Síntoma", value: s, origin: "user_reported" as const })),
      window: "Último cuestionario",
      quality: null,
      action: "Seguir el protocolo médico de la misión y contactar al personal sanitario correspondiente.",
      disclaimer: DISCLAIMER,
    });
  }
  if (report && report.fatigue >= ALERT_CONFIG.highPerceivedFatigue) {
    alerts.push({
      id: "self_fatigue",
      title: "Fatiga percibida alta",
      level: "watch",
      source: "user_reported",
      observed: `Indicaste una fatiga de ${report.fatigue}/5.`,
      signals: [{ label: "Fatiga percibida", value: `${report.fatigue}/5`, origin: "user_reported" }],
      window: "Último cuestionario",
      quality: null,
      action: "Planificar una pausa y revisar el próximo descanso.",
      disclaimer: DISCLAIMER,
    });
  }
  if (!report) {
    alerts.push({
      id: "questionnaire_pending",
      title: "Autoevaluación pendiente",
      level: "info",
      source: "user_reported",
      observed: "No hay un cuestionario de fatiga y síntomas en esta sesión.",
      signals: [],
      window: "Sesión actual",
      quality: null,
      action: "Completar la autoevaluación breve.",
      disclaimer: DISCLAIMER,
    });
  }

  return alerts.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}
