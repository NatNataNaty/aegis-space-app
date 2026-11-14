import { DAY_MS, toMissionTime } from "../mission/missionClock";
import { DEMO_PROFILE, SCENARIOS } from "./scenarios";
import { noise } from "./seed";
import type {
  DailyPoint,
  HistoryPoint,
  ScenarioDefinition,
  ScenarioId,
  SimSnapshot,
  SimStatus,
  SimVital,
  VitalId,
  VitalProfile,
} from "./simulation.types";

const RADIATION_MSV_PER_DAY = 1.8;
const EXERCISE_TARGET_MIN = 120;
const VALUE_BUCKET_MS = 5_000;

type Numeric = keyof VitalProfile;

const SHAPE: Record<Numeric, { amp: number; jitter: number; decimals: number }> = {
  heartRate: { amp: 5, jitter: 1.6, decimals: 0 },
  systolic: { amp: 5, jitter: 1.8, decimals: 0 },
  diastolic: { amp: 3, jitter: 1.2, decimals: 0 },
  spo2: { amp: 0.4, jitter: 0.4, decimals: 0 },
  respRate: { amp: 1, jitter: 0.6, decimals: 0 },
  temperature: { amp: 0.25, jitter: 0.05, decimals: 1 },
  glucose: { amp: 8, jitter: 2, decimals: 0 },
};

/** Tolerances around the demo profile; 1× → "watch", 2× → "variation". */
const TOLERANCE: Record<VitalId, number> = {
  heartRate: 9,
  bloodPressure: 10,
  spo2: 1.5,
  respRate: 3,
  temperature: 0.4,
  glucose: 12,
};

const UNITS: Record<VitalId, string> = {
  heartRate: "bpm",
  bloodPressure: "mmHg",
  spo2: "%",
  respRate: "resp/min",
  temperature: "°C",
  glucose: "mg/dL",
};

function round(v: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

/** Deterministic simulated value for a given mission instant. */
export function simulatedValue(
  scenario: ScenarioDefinition,
  key: Numeric,
  missionMs: number,
  bucketMs = VALUE_BUCKET_MS,
): number {
  const shape = SHAPE[key];
  const dayFraction = (missionMs % DAY_MS) / DAY_MS;
  // Circadian component peaking in the mission afternoon.
  const circadian = Math.sin(2 * Math.PI * (dayFraction - 0.375));
  const jitter = noise(scenario.seed, key, Math.floor(missionMs / bucketMs));
  let value = scenario.vitals[key] + shape.amp * circadian * 0.5 + shape.jitter * jitter;
  if (key === "spo2") value = Math.min(100, value);
  return round(value, shape.decimals);
}

export function statusFor(id: VitalId, value: number, value2?: number): SimStatus {
  const tol = TOLERANCE[id];
  let deviation: number;
  switch (id) {
    case "spo2":
      deviation = Math.max(0, DEMO_PROFILE.spo2 - value);
      break;
    case "bloodPressure":
      deviation = Math.max(
        Math.abs(value - DEMO_PROFILE.systolic),
        Math.abs((value2 ?? DEMO_PROFILE.diastolic) - DEMO_PROFILE.diastolic) * 1.4,
      );
      break;
    default:
      deviation = Math.abs(value - DEMO_PROFILE[id]);
  }
  if (deviation >= tol * 2) return "variation";
  if (deviation >= tol) return "watch";
  return "stable";
}

function vital(id: VitalId, value: number, recordedAt: number, value2?: number): SimVital {
  return {
    id,
    value,
    value2,
    unit: UNITS[id],
    status: statusFor(id, value, value2),
    origin: "simulated",
    recordedAt,
  };
}

function history24h(scenario: ScenarioDefinition, missionMs: number): HistoryPoint[] {
  const step = 30 * 60_000;
  const end = Math.floor(missionMs / step) * step;
  const points: HistoryPoint[] = [];
  for (let t = end - DAY_MS + step; t <= end; t += step) {
    points.push({
      label: toMissionTime(t).label.slice(-5),
      heartRate: simulatedValue(scenario, "heartRate", t, step),
      spo2: simulatedValue(scenario, "spo2", t, step),
      temperature: simulatedValue(scenario, "temperature", t, step),
      respRate: simulatedValue(scenario, "respRate", t, step),
      systolic: simulatedValue(scenario, "systolic", t, step),
      diastolic: simulatedValue(scenario, "diastolic", t, step),
    });
  }
  return points;
}

function trend7d(scenario: ScenarioDefinition, day: number): DailyPoint[] {
  return scenario.sleep7d.map((sleepHours, i) => {
    const d = day - (scenario.sleep7d.length - 1 - i);
    return {
      label: `D${d}`,
      sleepHours,
      restingHr: round(
        DEMO_PROFILE.heartRate - 4 + scenario.restingHrDrift * i + noise(scenario.seed, "rhr", d) * 1.2,
        0,
      ),
      exerciseMin: scenario.exercise7d[i],
      workloadHours: scenario.workload7d[i],
      radiationMsv: round(d * RADIATION_MSV_PER_DAY, 1),
    };
  });
}

/**
 * Generates only simulated data. Same scenario + same mission time → same snapshot,
 * so the demo is reproducible and React renders never re-randomize values.
 */
export function generateSnapshot(scenarioId: ScenarioId, missionMs: number, recordedAt: number): SimSnapshot {
  const s = SCENARIOS[scenarioId];
  const mt = toMissionTime(missionMs);
  const v = (k: Numeric) => simulatedValue(s, k, missionMs);

  const lastNight = s.sleep7d[s.sleep7d.length - 1];
  const avg7d = s.sleep7d.reduce((a, b) => a + b, 0) / s.sleep7d.length;
  const exerciseDone = s.schedule
    .filter((b) => b.kind === "exercise" && b.end <= mt.minuteOfDay && b.start < b.end)
    .reduce((sum, b) => sum + (b.end - b.start), 0);
  const exerciseTarget = s.exercise7d[s.exercise7d.length - 1];

  return {
    scenarioId,
    seed: s.seed,
    missionMs,
    vitals: {
      heartRate: vital("heartRate", v("heartRate"), recordedAt),
      bloodPressure: vital("bloodPressure", v("systolic"), recordedAt, v("diastolic")),
      spo2: vital("spo2", v("spo2"), recordedAt),
      respRate: vital("respRate", v("respRate"), recordedAt),
      temperature: vital("temperature", v("temperature"), recordedAt),
      glucose: vital("glucose", v("glucose"), recordedAt),
    },
    sleep: {
      lastNightHours: lastNight,
      actigraphyHours: lastNight,
      perceivedHours: round(lastNight + s.perceivedSleepDelta, 1),
      quality: s.sleepQuality,
      regularity: s.sleepRegularity,
      avg7d: round(avg7d, 1),
    },
    exposure: {
      totalMsv: round((missionMs / DAY_MS) * RADIATION_MSV_PER_DAY, 1),
      dailyMsv: RADIATION_MSV_PER_DAY,
    },
    activity: {
      exerciseTodayMin: Math.min(exerciseDone, exerciseTarget),
      exerciseTargetMin: Math.max(exerciseTarget, EXERCISE_TARGET_MIN),
      workloadLabel: s.workloadLabel,
      perceivedFatigue: s.perceivedFatigue,
    },
    history24h: history24h(s, missionMs),
    trend7d: trend7d(s, mt.day),
    origin: "simulated",
  };
}
