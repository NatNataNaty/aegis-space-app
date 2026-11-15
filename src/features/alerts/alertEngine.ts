import i18n, { fmtLocale } from "../../i18n";
import { getAlertRule, protocolForSymptom } from "../../lib/content";
import { median } from "../camera/eyeAspectRatio";
import type { VitalId } from "../simulation/simulation.types";
import type { Alert, AlertContext, AlertSignal, PerclosPoint } from "./alert.types";
import { ALERT_CONFIG, LEVEL_ORDER } from "./alertRules";

/** Textos en el idioma activo: el motor se reevalúa cada segundo, así que sigue al selector ES/EN. */
const t = (key: string, params: Record<string, unknown> = {}): string => i18n.t(key, params) as string;

const vitalLabel = (id: VitalId) => t(`engine.vital.${id}`);

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
    { label: t("engine.signal.prolonged"), value: String(s.prolongedClosures), origin: "camera_live" },
    { label: t("engine.signal.long"), value: String(s.longClosures), origin: "camera_live" },
    {
      label: t("engine.signal.perclos5"),
      value: s.perclos === null ? t("engine.unavailable") : `${fmtLocale(s.perclos, 1)} %`,
      origin: "camera_live",
    },
  ];
}

type AlertBody = Omit<Alert, "disclaimer" | "protocolId" | "askForHelp" | "buddyAfterSec">;

/** Añade el enlace al protocolo y la regla de ayuda definidos en content/alerts.json. */
function linked(body: AlertBody, ruleKey: string = body.id, fallbackProtocol: string | null = null): Alert {
  const rule = getAlertRule(ruleKey);
  return {
    ...body,
    disclaimer: t("engine.disclaimer"),
    protocolId: rule?.protocolId ?? fallbackProtocol,
    askForHelp: rule?.askForHelp ?? false,
    buddyAfterSec: rule?.buddyAfterSec ?? 30,
  };
}

/** Síntomas que siempre son rojo y avisan al compañero al instante (pendiente de revisión médica). */
export const RED_FLAG_SYMPTOMS: readonly string[] = ["chestPain", "breathing"];

/** Pure function: same context → same alerts. Never rewrites the origin of a signal. */
export function evaluateAlerts(ctx: AlertContext): Alert[] {
  const alerts: Alert[] = [];
  const cam = ctx.camera;
  const s300 = cam.summary300;
  // El fotograma actual también debe ser válido: un historial bueno no basta si la cámara ya no ve el rostro.
  const cameraUsable =
    cam.active && cam.calibrated && cam.frameQuality !== "unavailable" && s300 !== null && s300.quality !== "unavailable";
  const closures = s300 ? s300.prolongedClosures + s300.longClosures : 0;
  const sleepHours = ctx.sim.sleep.lastNightHours;
  const sleepShort = sleepHours < ALERT_CONFIG.insufficientSleepHours;

  if (cam.active && cam.frameQuality === "unavailable" && cam.unavailableForMs >= ALERT_CONFIG.cameraUnavailableMs) {
    alerts.push(
      linked({
        id: "camera_unavailable",
        title: t("engine.camera_unavailable.title"),
        level: "info",
        source: "camera_live",
        observed: cam.qualityReasons.length
          ? t("engine.camera_unavailable.observedReasons", { reasons: cam.qualityReasons.join(", ") })
          : t("engine.camera_unavailable.observed"),
        signals: [{ label: t("engine.signal.quality"), value: t("engine.unavailable"), origin: "camera_live" }],
        window: t("engine.camera_unavailable.window", { s: Math.round(cam.unavailableForMs / 1000) }),
        quality: "unavailable",
        action: t("engine.camera_unavailable.action"),
      }),
    );
  }

  if (ctx.restPeriod) {
    alerts.push(
      linked({
        id: "rest_period",
        title: t("engine.rest_period.title"),
        level: "info",
        source: "simulated",
        observed: t("engine.rest_period.observed"),
        signals: [{ label: t("engine.signal.scheduleBlock"), value: ctx.blockLabel, origin: "simulated" }],
        window: t("engine.rest_period.window"),
        quality: null,
        action: t("engine.rest_period.action"),
      }),
    );
  }

  const combined = !ctx.restPeriod && cameraUsable && closures >= ALERT_CONFIG.combinedClosures && sleepShort;

  if (combined) {
    alerts.push(
      linked({
        id: "combined_fatigue",
        title: t("engine.combined_fatigue.title"),
        level: "attention",
        source: "combined",
        observed: t("engine.combined_fatigue.observed", { closures, hours: fmtLocale(sleepHours, 1) }),
        signals: [
          ...closureSignals(ctx),
          { label: t("engine.signal.sleepLast"), value: `${fmtLocale(sleepHours, 1)} h`, origin: "simulated" },
          { label: t("engine.signal.block"), value: ctx.blockLabel, origin: "simulated" },
        ],
        window: t("engine.combined_fatigue.window"),
        quality: s300?.quality ?? null,
        action: t("engine.combined_fatigue.action"),
      }),
    );
  } else if (!ctx.restPeriod && cameraUsable && closures >= ALERT_CONFIG.repeatedClosures) {
    alerts.push(
      linked({
        id: "repeated_closures",
        title: t("engine.repeated_closures.title"),
        level: "watch",
        source: "camera_live",
        observed: t("engine.repeated_closures.observed", { closures }),
        signals: closureSignals(ctx),
        window: t("engine.repeated_closures.window"),
        quality: s300?.quality ?? null,
        action: t("engine.repeated_closures.action"),
      }),
    );
  }

  const perclos = perclosBaselineStatus(cam.perclosTrend);
  if (
    !ctx.restPeriod &&
    cameraUsable &&
    cam.summary60 !== null &&
    cam.summary60.quality !== "unavailable" &&
    perclos.elevatedWindows >= ALERT_CONFIG.perclosElevatedWindows
  ) {
    alerts.push(
      linked({
        id: "perclos_above_baseline",
        title: t("engine.perclos_above_baseline.title"),
        level: "watch",
        source: "camera_live",
        observed: t("engine.perclos_above_baseline.observed", { n: perclos.elevatedWindows }),
        signals: [
          { label: t("engine.signal.baseline"), value: `${fmtLocale(perclos.baseline ?? 0, 1)} %`, origin: "camera_live" },
          { label: t("engine.signal.latest"), value: `${fmtLocale(perclos.latest ?? 0, 1)} %`, origin: "camera_live" },
        ],
        window: t("engine.perclos_above_baseline.window", { n: perclos.elevatedWindows }),
        quality: cam.summary60?.quality ?? null,
        action: t("engine.perclos_above_baseline.action"),
      }),
    );
  }

  const vitals = Object.values(ctx.sim.vitals);
  const varied = vitals.filter((v) => v.status === "variation");
  const watched = vitals.filter((v) => v.status === "watch");
  if (varied.length || watched.length >= 2) {
    const list = [...varied, ...watched];
    // El protocolo depende de la señal: oxígeno antes que frecuencia cardíaca (plan: aviso inmediato).
    const lead = (["spo2", "heartRate"] as const).find((id) => list.some((v) => v.id === id));
    alerts.push(
      linked(
        {
          id: "sim_vitals",
          title: t("engine.sim_vitals.title"),
          level: varied.length ? "attention" : "watch",
          source: "simulated",
          observed: t("engine.sim_vitals.observed", { list: list.map((v) => vitalLabel(v.id)).join(", ") }),
          signals: list.map((v) => ({
            label: vitalLabel(v.id),
            value:
              v.id === "bloodPressure"
                ? `${v.value}/${v.value2} ${v.unit}`
                : `${fmtLocale(v.value, v.id === "temperature" ? 1 : 0)} ${v.unit}`,
            origin: "simulated" as const,
          })),
          window: t("engine.sim_vitals.window"),
          quality: null,
          action: t("engine.sim_vitals.action"),
        },
        lead ? `sim_vitals.${lead}` : "sim_vitals",
      ),
    );
  }

  if (sleepShort && !combined) {
    alerts.push(
      linked({
        id: "sim_sleep",
        title: t("engine.sim_sleep.title"),
        level: "watch",
        source: "simulated",
        observed: t("engine.sim_sleep.observed", { hours: fmtLocale(sleepHours, 1), avg: fmtLocale(ctx.sim.sleep.avg7d, 1) }),
        signals: [
          { label: t("engine.signal.sleepLast"), value: `${fmtLocale(sleepHours, 1)} h`, origin: "simulated" },
          { label: t("engine.signal.regularity"), value: `${ctx.sim.sleep.regularity} %`, origin: "simulated" },
        ],
        window: t("engine.sim_sleep.window"),
        quality: null,
        action: t("engine.sim_sleep.action"),
      }),
    );
  }

  // Una autoevaluación caducada (o con fecha futura) no vuelve a disparar alertas.
  const reportAge = ctx.evaluatedAt === undefined || !ctx.selfReport ? 0 : ctx.evaluatedAt - ctx.selfReport.recordedAt;
  const report = reportAge >= 0 && reportAge <= ALERT_CONFIG.selfReportMaxAgeMs ? ctx.selfReport : null;
  if (report && report.symptoms.length) {
    const symptomLabel = (s: string) => t(`sections.self.symptom.${s}`, { defaultValue: s });
    // Señales de alarma (dolor de pecho, falta de aire): su protocolo va primero y el aviso al compañero es inmediato.
    const redFlag = report.symptoms.some((s) => RED_FLAG_SYMPTOMS.includes(s));
    const ordered = [...report.symptoms].sort((a, b) => Number(RED_FLAG_SYMPTOMS.includes(b)) - Number(RED_FLAG_SYMPTOMS.includes(a)));
    const protocolId = ordered.map(protocolForSymptom).find(Boolean) ?? null;
    const symptomAlert = linked(
        {
          id: "self_symptoms",
          title: t("engine.self_symptoms.title"),
          level: "attention",
          source: "user_reported",
          observed: t("engine.self_symptoms.observed", { list: report.symptoms.map(symptomLabel).join(", ") }),
          signals: report.symptoms.map((s) => ({ label: t("engine.signal.symptom"), value: symptomLabel(s), origin: "user_reported" as const })),
          window: t("engine.self_symptoms.window"),
          quality: null,
          action: t("engine.self_symptoms.action"),
        },
        "self_symptoms",
        protocolId,
      );
    alerts.push(redFlag ? { ...symptomAlert, askForHelp: true, buddyAfterSec: 0 } : symptomAlert);
  }
  if (report && report.fatigue >= ALERT_CONFIG.highPerceivedFatigue) {
    alerts.push(
      linked({
        id: "self_fatigue",
        title: t("engine.self_fatigue.title"),
        level: "watch",
        source: "user_reported",
        observed: t("engine.self_fatigue.observed", { n: report.fatigue }),
        signals: [{ label: t("engine.signal.fatigue"), value: `${report.fatigue}/5`, origin: "user_reported" }],
        window: t("engine.self_fatigue.window"),
        quality: null,
        action: t("engine.self_fatigue.action"),
      }),
    );
  }
  if (!report) {
    alerts.push(
      linked({
        id: "questionnaire_pending",
        title: t("engine.questionnaire_pending.title"),
        level: "info",
        source: "user_reported",
        observed: t("engine.questionnaire_pending.observed"),
        signals: [],
        window: t("engine.questionnaire_pending.window"),
        quality: null,
        action: t("engine.questionnaire_pending.action"),
      }),
    );
  }

  return alerts.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}
