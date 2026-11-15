import { ChevronDown, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useActiveCrew } from "../../data/crew";
import { MISSION, toMissionTime } from "../../features/mission/missionClock";
import { SCENARIO_ORDER, SCENARIOS } from "../../features/simulation/scenarios";
import type { ScenarioId } from "../../features/simulation/simulation.types";
import { useHealthStore } from "../../stores/health.store";
import { useMissionStore } from "../../stores/mission.store";
import { LiveIndicator } from "../camera/LiveIndicator";
import { LanguageSwitch } from "./LanguageSwitch";

interface TopBarProps {
  onOpenAssistant: () => void;
}

/** Barra superior del diseño: quién eres y dónde estás, y cuatro controles sencillos. */
export function TopBar({ onOpenAssistant }: TopBarProps) {
  const { t } = useTranslation();
  const missionMs = useMissionStore((s) => s.missionMs);
  const scenarioId = useHealthStore((s) => s.scenarioId);
  const setScenario = useHealthStore((s) => s.setScenario);
  const mt = toMissionTime(missionMs);
  const crew = useActiveCrew();

  return (
    <header className="topbar">
      <div className="topbar__crew">
        <span className="topbar__crew-name">
          {crew.name} <small>· {t(`crew.role.${crew.role}`)}</small>
        </span>
        <span className="topbar__crew-mission">
          {MISSION.id} · {t("mission.name")} · {t("mission.day", { day: mt.day })} · {mt.clock.slice(0, 5)}
        </span>
      </div>

      <div className="topbar__actions">
        <label className="pill pill--select scenario">
          <span className="sr-only">{t("scenario.label")}</span>
          <select value={scenarioId} onChange={(e) => setScenario(e.target.value as ScenarioId)}>
            {SCENARIO_ORDER.map((id) => (
              <option key={id} value={id}>
                {t(`scenario.${id}`, { defaultValue: SCENARIOS[id].name })}
              </option>
            ))}
          </select>
          <ChevronDown size={14} aria-hidden />
        </label>

        <button type="button" className="pill" onClick={onOpenAssistant}>
          <Sparkles size={14} aria-hidden />
          {t("modules.assistant")}
        </button>

        <LanguageSwitch />
        <span className="pill">
          <LiveIndicator />
        </span>
      </div>
    </header>
  );
}
