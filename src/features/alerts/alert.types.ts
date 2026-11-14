import type { DataOrigin, OcularSummary, Quality } from "../camera/camera.types";
import type { SimSnapshot } from "../simulation/simulation.types";

export type AlertLevel = "info" | "watch" | "attention";

export type AlertSource = "camera_live" | "simulated" | "combined" | "user_reported";

export interface AlertSignal {
  label: string;
  value: string;
  origin: DataOrigin;
}

export interface Alert {
  id: string;
  title: string;
  level: AlertLevel;
  source: AlertSource;
  observed: string;
  signals: AlertSignal[];
  window: string;
  quality: Quality | null;
  action: string;
  disclaimer: string;
}

export interface SelfReport {
  fatigue: number;
  mood: number;
  stress: number;
  symptoms: string[];
  recordedAt: number;
}

export interface ReactionTestResult {
  trialsMs: number[];
  meanMs: number;
  medianMs: number;
  recordedAt: number;
}

export interface PerclosPoint {
  t: number;
  perclos: number | null;
}

export interface AlertContext {
  camera: {
    active: boolean;
    calibrated: boolean;
    frameQuality: Quality | null;
    qualityReasons: string[];
    unavailableForMs: number;
    summary60: OcularSummary | null;
    summary300: OcularSummary | null;
    perclosTrend: PerclosPoint[];
  };
  sim: SimSnapshot;
  restPeriod: boolean;
  blockLabel: string;
  selfReport: SelfReport | null;
}
