import i18n from "../../i18n";
import type { AlertLevel } from "./alert.types";

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

export const LEVEL_ORDER: Record<AlertLevel, number> = { attention: 0, watch: 1, info: 2 };

export interface RuleExplanation {
  id: string;
  condition: string;
  result: string;
}

const RULE_IDS = [
  "camera_unavailable",
  "rest_period",
  "repeated_closures",
  "perclos_above_baseline",
  "combined_fatigue",
  "sim_vitals",
  "self_symptoms",
] as const;

/** Reglas activas explicadas en el idioma actual (las cifras salen de ALERT_CONFIG). */
export function ruleExplanations(): RuleExplanation[] {
  const params: Record<string, Record<string, number>> = {
    repeated_closures: { n: ALERT_CONFIG.repeatedClosures },
    perclos_above_baseline: { n: ALERT_CONFIG.perclosElevatedWindows },
    combined_fatigue: { n: ALERT_CONFIG.combinedClosures, h: ALERT_CONFIG.insufficientSleepHours },
  };
  return RULE_IDS.map((id) => {
    const [condition, result] = i18n.t(`engine.rules.${id}`, { returnObjects: true, ...params[id] }) as unknown as string[];
    return { id, condition, result };
  });
}
