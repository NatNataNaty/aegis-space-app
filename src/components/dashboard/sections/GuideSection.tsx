import { Lightbulb } from "lucide-react";
import { METRIC_INFO, type MetricId } from "../../../data/metricCatalog";
import { RULES } from "../../../features/alerts/alertRules";
import { SCENARIOS } from "../../../features/simulation/scenarios";
import { useHealthStore } from "../../../stores/health.store";
import { OriginBadge } from "../../common/OriginBadge";

const GUIDE_METRICS: MetricId[] = ["perclos", "blinkRate", "closures", "ear", "quality", "yawn", "sleep", "radiation"];

export function GuideSection() {
  const scenarioId = useHealthStore((s) => s.scenarioId);
  const scenario = SCENARIOS[scenarioId];

  return (
    <div className="section-grid section-grid--wide">
      <article className="panel">
        <header className="panel__head">
          <div>
            <h3>
              <Lightbulb size={16} aria-hidden /> Acciones educativas · {scenario.name}
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
        <p className="panel__note">
          aegis-space-med no recomienda medicamentos ni dosis. Ante síntomas o señales graves se sigue el protocolo médico de
          la misión.
        </p>

        <h4 className="subhead">Reglas de observación</h4>
        <table className="rules">
          <thead>
            <tr>
              <th>Condición</th>
              <th>Resultado</th>
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
            <h3>¿Qué significa cada indicador?</h3>
          </div>
        </header>
        <dl className="glossary">
          {GUIDE_METRICS.map((id) => {
            const info = METRIC_INFO[id];
            return (
              <div key={id}>
                <dt>{info.label}</dt>
                <dd>
                  {info.what}
                  {"note" in info && info.note && <em> {info.note}</em>}
                </dd>
              </div>
            );
          })}
        </dl>
      </article>
    </div>
  );
}
