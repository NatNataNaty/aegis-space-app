import { Lightbulb } from "lucide-react";
import { METRIC_INFO, type MetricId } from "../../../data/metricCatalog";
import { RULES } from "../../../features/alerts/alertRules";
import { SCENARIOS } from "../../../features/simulation/scenarios";
import { useHealthStore } from "../../../stores/health.store";
import { OriginBadge } from "../../common/OriginBadge";
import { useTranslation } from "react-i18next";

const GUIDE_METRICS: MetricId[] = ["perclos", "blinkRate", "closures", "ear", "quality", "yawn", "sleep", "radiation"];

export function GuideSection() {
  const { t } = useTranslation();
  const scenarioId = useHealthStore((s) => s.scenarioId);
  const scenario = SCENARIOS[scenarioId];

  return (
    <div className="section-grid section-grid--wide">
      <article className="panel">
        <header className="panel__head">
          <div>
            <h3>
              <Lightbulb size={16} aria-hidden /> {t("sections.guide.actions", { scenario: t(`scenario.${scenarioId}`) })}
            </h3>
            <p className="panel__sub">{scenario.summary}</p>
          </div>
          <OriginBadge origin="simulated" />
        </header>
        <ul className="guide-list">
          {scenario.recommendations.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <p className="panel__note">{t("sections.guide.noMeds")}</p>

        <h4 className="subhead">{t("sections.guide.rules")}</h4>
        <table className="rules">
          <thead>
            <tr>
              <th>{t("sections.guide.condition")}</th>
              <th>{t("sections.guide.result")}</th>
            </tr>
          </thead>
          <tbody>
            {RULES.map((r) => (
              <tr key={r.id}>
                <td>{r.condition}</td>
                <td>{r.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      <article className="panel">
        <header className="panel__head">
          <div>
            <h3>{t("sections.guide.glossary")}</h3>
          </div>
        </header>
        <dl className="glossary">
          {GUIDE_METRICS.map((id) => {
            const info = METRIC_INFO[id];
            const note = "note" in info && info.note ? t(`metricInfo.${id}.note`, { defaultValue: info.note }) : null;
            return (
              <div key={id}>
                <dt>{t(`metricInfo.${id}.label`, { defaultValue: info.label })}</dt>
                <dd>
                  {t(`metricInfo.${id}.what`, { defaultValue: info.what })}
                  {note && <em> {note}</em>}
                </dd>
              </div>
            );
          })}
        </dl>
      </article>
    </div>
  );
}
