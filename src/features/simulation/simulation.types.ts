import type { ScheduleBlock } from "../mission/schedule";

export type ScenarioId =
  | "stable"
  | "sleep_deficit"
  | "accumulated_fatigue"
  | "physio_variation"
  | "recovery";

/** Describes the simulated scenario, never a diagnosis. */
export type SimStatus = "stable" | "watch" | "variation";

export type VitalId = "heartRate" | "bloodPressure" | "spo2" | "respRate" | "temperature" | "glucose";

export interface VitalProfile {
  heartRate: number;
  systolic: number;
  diastolic: number;
  spo2: number;
  respRate: number;
  temperature: number;
  glucose: number;
}

export interface ScenarioDefinition {
  id: ScenarioId;
  name: string;
  summary: string;
  seed: number;
  /** Mission minute of day at which the demo clock starts. */
  startMinute: number;
  vitals: VitalProfile;
  /** Hours of sleep for the last 7 nights, oldest first. */
  sleep7d: number[];
  sleepQuality: number;
  sleepRegularity: number;
  perceivedSleepDelta: number;
  exercise7d: number[];
  workload7d: number[];
  workloadLabel: "habitual" | "elevada" | "exigente";
  perceivedFatigue: number;
  restingHrDrift: number;
  schedule: ScheduleBlock[];
  alertLog: { minutesAgo: number; title: string; detail: string; level: "info" | "watch" | "attention" }[];
  recommendations: string[];
}

export interface SimVital {
  id: VitalId;
  value: number;
  value2?: number;
  unit: string;
  status: SimStatus;
  origin: "simulated";
  recordedAt: number;
}

export interface HistoryPoint {
  label: string;
  heartRate: number;
  spo2: number;
  temperature: number;
  respRate: number;
  systolic: number;
  diastolic: number;
}

export interface DailyPoint {
  label: string;
  sleepHours: number;
  restingHr: number;
  exerciseMin: number;
  workloadHours: number;
  radiationMsv: number;
}

export interface SimSnapshot {
  scenarioId: ScenarioId;
  seed: number;
  missionMs: number;
  vitals: Record<VitalId, SimVital>;
  sleep: {
    lastNightHours: number;
    actigraphyHours: number;
    perceivedHours: number;
    quality: number;
    regularity: number;
    avg7d: number;
  };
  exposure: {
    totalMsv: number;
    dailyMsv: number;
  };
  activity: {
    exerciseTodayMin: number;
    exerciseTargetMin: number;
    workloadLabel: ScenarioDefinition["workloadLabel"];
    perceivedFatigue: number;
  };
  history24h: HistoryPoint[];
  trend7d: DailyPoint[];
  origin: "simulated";
}
