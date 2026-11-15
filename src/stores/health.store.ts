import { create } from "zustand";
import type { Alert, ReactionTestResult, SelfReport } from "../features/alerts/alert.types";
import { SCENARIOS } from "../features/simulation/scenarios";
import { generateSnapshot } from "../features/simulation/simulation.service";
import type { ScenarioId, SimSnapshot } from "../features/simulation/simulation.types";
import { loadPref, savePref } from "../lib/storage";
import { useMissionStore } from "./mission.store";

export interface LoggedAlert {
  key: string;
  alert: Alert;
  firstSeenAt: number;
  missionLabel: string;
  active: boolean;
}

interface HealthState {
  scenarioId: ScenarioId;
  snapshot: SimSnapshot;
  selfReport: SelfReport | null;
  reactionTest: ReactionTestResult | null;
  activeAlerts: Alert[];
  /** Todo lo que devolvió el motor, incluidas las alertas ya atendidas (ocultas en la interfaz). */
  rawAlerts: Alert[];
  /** Alertas atendidas: id → última vez que el motor la seguía viendo. */
  attended: Record<string, number>;
  /** false hasta la primera evaluación del motor (al arrancar la lista vacía no significa «sin alertas»). */
  alertsEvaluated: boolean;
  alertLog: LoggedAlert[];

  setScenario: (id: ScenarioId) => void;
  refreshSnapshot: (missionMs: number) => void;
  setSelfReport: (report: SelfReport) => void;
  setReactionTest: (result: ReactionTestResult) => void;
  setAlerts: (alerts: Alert[], missionLabel: string) => void;
  /** Marca como atendidas las alertas activas que cumplen la condición: dejan de mostrarse. */
  attendAlerts: (match: (a: Alert) => boolean) => void;
}

/** Una alerta atendida vuelve a mostrarse solo si desaparece este tiempo y luego reaparece. */
const ATTENDED_FORGET_MS = 60_000;

const savedScenario = loadPref<ScenarioId>("scenario", "stable");
const initialScenario: ScenarioId = savedScenario in SCENARIOS ? savedScenario : "stable";
useMissionStore.getState().restart(SCENARIOS[initialScenario].startMinute);

export const useHealthStore = create<HealthState>((set, get) => ({
  scenarioId: initialScenario,
  snapshot: generateSnapshot(initialScenario, useMissionStore.getState().missionMs, Date.now()),
  selfReport: null,
  reactionTest: null,
  activeAlerts: [],
  rawAlerts: [],
  attended: loadPref<Record<string, number>>("attendedAlerts", {}),
  alertsEvaluated: false,
  alertLog: [],

  setScenario: (id) => {
    savePref("scenario", id);
    useMissionStore.getState().restart(SCENARIOS[id].startMinute);
    const missionMs = useMissionStore.getState().missionMs;
    set({ scenarioId: id, snapshot: generateSnapshot(id, missionMs, Date.now()) });
  },

  refreshSnapshot: (missionMs) => {
    set({ snapshot: generateSnapshot(get().scenarioId, missionMs, Date.now()) });
  },

  setSelfReport: (selfReport) => set({ selfReport }),
  setReactionTest: (reactionTest) => set({ reactionTest }),

  attendAlerts: (match) => {
    const now = Date.now();
    const hits = get().rawAlerts.filter(match);
    if (!hits.length) return;
    const attended = { ...get().attended };
    for (const a of hits) attended[a.id] = now;
    savePref("attendedAlerts", attended);
    set({ attended, activeAlerts: get().rawAlerts.filter((a) => !(a.id in attended)) });
  },

  setAlerts: (raw, missionLabel) => {
    // Las atendidas siguen en el motor pero no en pantalla; se olvidan cuando la señal desaparece.
    const now = Date.now();
    const rawIds = new Set(raw.map((a) => a.id));
    const prev = get().attended;
    const attended: Record<string, number> = {};
    for (const [id, seen] of Object.entries(prev)) {
      if (rawIds.has(id)) attended[id] = now;
      else if (now - seen < ATTENDED_FORGET_MS) attended[id] = seen;
    }
    const attendedChanged =
      Object.keys(attended).length !== Object.keys(prev).length ||
      Object.entries(attended).some(([id, seen]) => now - seen > 5_000 || !(id in prev));
    if (attendedChanged) savePref("attendedAlerts", attended);
    set({ rawAlerts: raw, attended });
    const alerts = raw.filter((a) => !(a.id in attended));

    const signature = (list: Alert[]) => list.map((a) => `${a.id}|${a.level}|${a.observed}`).join("¦");
    if (!get().alertsEvaluated) set({ alertsEvaluated: true });
    if (signature(alerts) === signature(get().activeAlerts)) return;

    const keyOf = (a: Alert) => `${a.id}:${a.level}`;
    const byKey = new Map(alerts.map((a) => [keyOf(a), a]));
    const log = get().alertLog.map((entry) => {
      if (!entry.active) return entry;
      const current = byKey.get(entry.key);
      return current ? { ...entry, alert: current } : { ...entry, active: false };
    });
    for (const alert of alerts) {
      const key = keyOf(alert);
      if (!log.some((e) => e.key === key && e.active)) {
        log.unshift({ key, alert, firstSeenAt: now, missionLabel, active: true });
      }
    }
    set({ activeAlerts: alerts, alertLog: log.slice(0, 50) });
  },
}));
