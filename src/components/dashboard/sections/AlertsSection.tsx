import { toMissionTime } from "../../../features/mission/missionClock";
import { SCENARIOS } from "../../../features/simulation/scenarios";
import { useHealthStore } from "../../../stores/health.store";
import { useMissionStore } from "../../../stores/mission.store";
import { AlertItem } from "../../alerts/AlertItem";
import { LevelIcon } from "../../alerts/LevelIcon";
import { OriginBadge } from "../../common/OriginBadge";
import { useTranslation } from "react-i18next";
import { simT } from "../../../i18n";

export function AlertsSection() {
  const { t } = useTranslation();
  const active = useHealthStore((s) => s.activeAlerts);
  const log = useHealthStore((s) => s.alertLog);
  const scenarioId = useHealthStore((s) => s.scenarioId);
  const baseMissionMs = useMissionStore((s) => s.baseMissionMs);

  const resolved = log.filter((e) => !e.active).slice(0, 12);
  const scenarioLog = SCENARIOS[scenarioId].alertLog.map((e) => ({
    ...e,
    label: toMissionTime(baseMissionMs - e.minutesAgo * 60_000).label,
  }));

  return (
    <div className="section-grid section-grid--wide">
      <article className="panel">
        <header className="panel__head">
          <div>
            <h3>{t("sections.alerts.activeTitle")}</h3>
            <p className="panel__sub">{t("sections.alerts.activeSub")}</p>
          </div>
        </header>
        {active.length === 0 ? (
          <p className="empty">{t("sections.alerts.none")}</p>
        ) : (
          <ul className="alert-list">
            {active.map((a, i) => (
              <AlertItem key={a.id} alert={a} defaultOpen={i === 0 && a.level !== "info"} />
            ))}
          </ul>
        )}
      </article>

      <article className="panel">
        <header className="panel__head">
          <div>
            <h3>{t("sections.alerts.historyTitle")}</h3>
            <p className="panel__sub">{t("sections.alerts.historySub")}</p>
          </div>
        </header>
        <ul className="history">
          {resolved.map((e) => (
            <li key={`${e.key}-${e.firstSeenAt}`}>
              <LevelIcon level={e.alert.level} />
              <div>
                <span className="history__title">{e.alert.title}</span>
                <span className="history__meta">
                  {e.missionLabel} · {t(`alerts.sourceLabel.${e.alert.source}`)} · {t("sections.alerts.ended")}
                </span>
              </div>
            </li>
          ))}
          {scenarioLog.map((e, i) => (
            <li key={`sim-${i}`}>
              <LevelIcon level={e.level} />
              <div>
                <span className="history__title">{simT(e.title)}</span>
                <span className="history__meta">
                  {e.label} · {simT(e.detail)}
                </span>
              </div>
              <OriginBadge origin="simulated" />
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}
