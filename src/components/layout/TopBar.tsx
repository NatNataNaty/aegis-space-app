import { Bell, Database } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MISSION, toMissionTime } from "../../features/mission/missionClock";
import { blockAt } from "../../features/mission/schedule";
import { SCENARIO_ORDER, SCENARIOS } from "../../features/simulation/scenarios";
import type { ScenarioId } from "../../features/simulation/simulation.types";
import { useHealthStore } from "../../stores/health.store";
import { useMissionStore } from "../../stores/mission.store";
import { LiveIndicator } from "../camera/LiveIndicator";
import { LanguageSwitch } from "./LanguageSwitch";

interface TopBarProps {
  onOpenAbout: () => void;
  onOpenAlerts: () => void;
}

export function TopBar({ onOpenAbout, onOpenAlerts }: TopBarProps) {
  const { t } = useTranslation();
  const missionMs = useMissionStore((s) => s.missionMs);
  const scenarioId = useHealthStore((s) => s.scenarioId);
  const setScenario = useHealthStore((s) => s.setScenario);
  const alertCount = useHealthStore((s) => s.activeAlerts.filter((a) => a.level !== "info").length);

  const mt = toMissionTime(missionMs);
  const block = blockAt(SCENARIOS[scenarioId].schedule, mt.minuteOfDay);

  return (
    <header className="topbar">
      <div className="topbar__crew">
        <span className="topbar__crew-name">{t("hero.crewName")}</span>
        <span className="topbar__crew-mission">
          {MISSION.id} · {t("mission.name")}
        </span>
      </div>

      <div className="topbar__clock" title={t("mission.clockTitle")}>
        <span className="topbar__met">
          {t("mission.day", { day: mt.day })} · {mt.clock}
        </span>
        {block && (
          <span className={`block-chip block-chip--${block.kind}`}>{t(`block.${block.kind}`)}</span>
        )}
      </div>

      <div className="topbar__actions">
        <label className="scenario">
          <span className="scenario__label">{t("scenario.label")}</span>
          <select value={scenarioId} onChange={(e) => setScenario(e.target.value as ScenarioId)}>
            {SCENARIO_ORDER.map((id) => (
              <option key={id} value={id}>
                {t(`scenario.${id}`, { defaultValue: SCENARIOS[id].name })}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="icon-btn" onClick={onOpenAlerts} aria-label={t("topbar.alertsActive", { count: alertCount })}>
          <Bell size={18} aria-hidden />
          {alertCount > 0 && <span className="icon-btn__count">{alertCount}</span>}
        </button>

        <button type="button" className="btn btn--ghost" onClick={onOpenAbout} aria-label={t("topbar.aboutData")}>
          <Database size={15} aria-hidden />
          <span className="btn__label">{t("topbar.aboutData")}</span>
        </button>

        <LanguageSwitch />
        <LiveIndicator />
      </div>
    </header>
  );
}
