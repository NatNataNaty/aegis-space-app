import { toMissionTime } from "../../../features/mission/missionClock";
import { SOURCE_LABEL } from "../../../features/alerts/alertRules";
import { SCENARIOS } from "../../../features/simulation/scenarios";
import { useHealthStore } from "../../../stores/health.store";
import { useMissionStore } from "../../../stores/mission.store";
import { AlertItem } from "../../alerts/AlertItem";
import { LevelIcon } from "../../alerts/LevelIcon";
import { OriginBadge } from "../../common/OriginBadge";

export function AlertsSection() {
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
            <h3>Observaciones activas</h3>
            <p className="panel__sub">Cada observación indica sus señales, su fuente y la calidad de la medición.</p>
          </div>
        </header>
        {active.length === 0 ? (
          <p className="empty">Sin observaciones activas.</p>
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
            <h3>Historial</h3>
            <p className="panel__sub">Observaciones de esta sesión y registro del escenario.</p>
          </div>
        </header>
        <ul className="history">
          {resolved.map((e) => (
            <li key={`${e.key}-${e.firstSeenAt}`}>
              <LevelIcon level={e.alert.level} />
              <div>
                <span className="history__title">{e.alert.title}</span>
                <span className="history__meta">
                  {e.missionLabel} · {SOURCE_LABEL[e.alert.source]} · finalizada
                </span>
              </div>
            </li>
          ))}
          {scenarioLog.map((e, i) => (
            <li key={`sim-${i}`}>
              <LevelIcon level={e.level} />
              <div>
                <span className="history__title">{e.title}</span>
                <span className="history__meta">
                  {e.label} · {e.detail}
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
