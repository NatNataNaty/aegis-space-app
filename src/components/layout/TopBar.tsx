import { Bell, Database, Orbit } from "lucide-react";
import { MISSION, toMissionTime } from "../../features/mission/missionClock";
import { blockAt, BLOCK_LABEL } from "../../features/mission/schedule";
import { SCENARIO_ORDER, SCENARIOS } from "../../features/simulation/scenarios";
import type { ScenarioId } from "../../features/simulation/simulation.types";
import { useHealthStore } from "../../stores/health.store";
import { useMissionStore } from "../../stores/mission.store";
import { LiveIndicator } from "../camera/LiveIndicator";

interface TopBarProps {
  onOpenAbout: () => void;
  onOpenAlerts: () => void;
}

export function TopBar({ onOpenAbout, onOpenAlerts }: TopBarProps) {
  const missionMs = useMissionStore((s) => s.missionMs);
  const scenarioId = useHealthStore((s) => s.scenarioId);
  const setScenario = useHealthStore((s) => s.setScenario);
  const alertCount = useHealthStore((s) => s.activeAlerts.filter((a) => a.level !== "info").length);

  const mt = toMissionTime(missionMs);
  const block = blockAt(SCENARIOS[scenarioId].schedule, mt.minuteOfDay);

  return (
    <header className="topbar">
      <div className="brand">
        <Orbit size={22} aria-hidden />
        <div>
          <span className="brand__name">ASTRA Health</span>
          <span className="brand__mission">
            {MISSION.id} · {MISSION.name}
          </span>
        </div>
      </div>

      <div className="topbar__clock" title="Tiempo de misión simulado">
        <span className="topbar__met">
          Día {mt.day} · {mt.clock}
        </span>
        {block && (
          <span className={`block-chip block-chip--${block.kind}`}>{BLOCK_LABEL[block.kind]}</span>
        )}
      </div>

      <div className="topbar__actions">
        <label className="scenario">
          <span className="scenario__label">Escenario de misión</span>
          <select value={scenarioId} onChange={(e) => setScenario(e.target.value as ScenarioId)}>
            {SCENARIO_ORDER.map((id) => (
              <option key={id} value={id}>
                {SCENARIOS[id].name}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="icon-btn" onClick={onOpenAlerts} aria-label={`Alertas activas: ${alertCount}`}>
          <Bell size={18} aria-hidden />
          {alertCount > 0 && <span className="icon-btn__count">{alertCount}</span>}
        </button>

        <button type="button" className="btn btn--ghost" onClick={onOpenAbout}>
          <Database size={15} aria-hidden />
          <span className="btn__label">Acerca de los datos</span>
        </button>

        <LiveIndicator />
      </div>
    </header>
  );
}
