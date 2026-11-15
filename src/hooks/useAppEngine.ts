import { useEffect, useRef } from "react";
import { evaluateAlerts } from "../features/alerts/alertEngine";
import { toMissionTime } from "../features/mission/missionClock";
import { useBaselineStore } from "../features/baseline/personalBaseline";
import { blockAt } from "../features/mission/schedule";
import i18n, { simT } from "../i18n";
import { SCENARIOS } from "../features/simulation/scenarios";
import { useCameraStore } from "../stores/camera.store";
import { useHealthStore } from "../stores/health.store";
import { useMissionStore } from "../stores/mission.store";

const SNAPSHOT_BUCKET_MS = 5_000;

/** Single app-level ticker: mission clock, simulated snapshot and alert evaluation. */
export function useAppEngine(): void {
  const lastBucket = useRef(-1);
  const unavailableSince = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      const mission = useMissionStore.getState();
      mission.tick();
      const missionMs = useMissionStore.getState().missionMs;
      const health = useHealthStore.getState();

      const bucket = Math.floor(missionMs / SNAPSHOT_BUCKET_MS);
      if (bucket !== lastBucket.current || health.snapshot.scenarioId !== health.scenarioId) {
        lastBucket.current = bucket;
        health.refreshSnapshot(missionMs);
        // La línea base personal aprende de cada lectura nueva (no cambia umbrales de alerta).
        useBaselineStore.getState().learn(useHealthStore.getState().snapshot, toMissionTime(missionMs).day);
      }

      const cam = useCameraStore.getState();
      const active = cam.status === "active";
      const frameQuality = active ? (cam.frame?.quality ?? null) : null;
      if (frameQuality === "unavailable") unavailableSince.current ??= Date.now();
      else unavailableSince.current = null;

      const mt = toMissionTime(missionMs);
      const scenario = SCENARIOS[health.scenarioId];
      const block = blockAt(scenario.schedule, mt.minuteOfDay);

      const alerts = evaluateAlerts({
        evaluatedAt: Date.now(),
        camera: {
          active,
          calibrated: cam.calibration.phase === "ready",
          frameQuality,
          qualityReasons: (cam.frame?.qualityReasons ?? []).map(simT),
          unavailableForMs: unavailableSince.current ? Date.now() - unavailableSince.current : 0,
          summary60: active ? cam.summary60 : null,
          summary300: active ? cam.summary300 : null,
          perclosTrend: cam.trend.map((p) => ({ t: p.t, perclos: p.perclos })),
        },
        sim: useHealthStore.getState().snapshot,
        restPeriod: block?.kind === "sleep",
        blockLabel: block ? `${i18n.t(`block.${block.kind}`)} · ${simT(block.label)}` : i18n.t("engine.noBlock"),
        selfReport: health.selfReport,
      });
      health.setAlerts(alerts, mt.label);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);
}
