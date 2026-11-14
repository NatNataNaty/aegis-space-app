import type { AlertLevel, AlertSource } from "./alert.types";

/** Demo thresholds. Engineering choices for the prototype, not medical limits. */
export const ALERT_CONFIG = {
  cameraUnavailableMs: 3000,
  /** Prolonged + long closures in the 5-min window. */
  repeatedClosures: 3,
  combinedClosures: 2,
  /** Simulated sleep below this is treated as insufficient in the demo. */
  insufficientSleepHours: 6,
  perclosWindowSpacingMs: 60_000,
  perclosBaselineWindows: 3,
  perclosElevatedWindows: 2,
  perclosMarginPoints: 5,
  perclosMarginRatio: 1.5,
  highPerceivedFatigue: 4,
} as const;

export const DISCLAIMER = "Prototipo educativo de apoyo a la observación. No es un diagnóstico.";

export const LEVEL_ORDER: Record<AlertLevel, number> = { attention: 0, watch: 1, info: 2 };

export const LEVEL_LABEL: Record<AlertLevel, string> = {
  info: "Información",
  watch: "Seguimiento",
  attention: "Atención",
};

export const SOURCE_LABEL: Record<AlertSource, string> = {
  camera_live: "Cámara real",
  simulated: "Simulador",
  combined: "Combinada (demo)",
  user_reported: "Autorreporte",
};

export interface RuleExplanation {
  id: string;
  condition: string;
  result: string;
}

export const RULES: RuleExplanation[] = [
  { id: "camera_unavailable", condition: "Cámara sin rostro u ojos visibles", result: "Medición no disponible; sin alerta ocular" },
  { id: "rest_period", condition: "Periodo programado de descanso", result: "Contexto de descanso; los cierres no se tratan como anomalía" },
  { id: "repeated_closures", condition: `≥ ${ALERT_CONFIG.repeatedClosures} cierres prolongados o largos en 5 min de trabajo`, result: "Revisar nivel de alerta" },
  { id: "perclos_above_baseline", condition: `PERCLOS sobre tu referencia en ${ALERT_CONFIG.perclosElevatedWindows} ventanas válidas`, result: "Aumento de cierres oculares respecto a tu referencia" },
  { id: "combined_fatigue", condition: `≥ ${ALERT_CONFIG.combinedClosures} cierres prolongados + sueño simulado < ${ALERT_CONFIG.insufficientSleepHours} h`, result: "Señales compatibles con fatiga en este escenario de demo" },
  { id: "sim_vitals", condition: "Signos vitales simulados fuera del perfil", result: "Variación en datos simulados" },
  { id: "self_symptoms", condition: "Síntomas autorreportados", result: "Seguir el protocolo médico de la misión" },
];
