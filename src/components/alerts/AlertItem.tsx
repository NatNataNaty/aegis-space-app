import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { Alert } from "../../features/alerts/alert.types";
import { LEVEL_LABEL, SOURCE_LABEL } from "../../features/alerts/alertRules";
import { cx } from "../../lib/format";
import { OriginBadge } from "../common/OriginBadge";
import { QualityTag } from "../common/StatusTag";
import { LevelIcon } from "./LevelIcon";

export function AlertItem({ alert, defaultOpen = false }: { alert: Alert; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <li className={cx("alert", `alert--${alert.level}`, open && "alert--open")}>
      <button type="button" className="alert__summary" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <LevelIcon level={alert.level} />
        <span className="alert__title">{alert.title}</span>
        <span className={`alert__level alert__level--${alert.level}`}>{LEVEL_LABEL[alert.level]}</span>
        <span className="alert__source">{SOURCE_LABEL[alert.source]}</span>
        <ChevronDown size={16} className="alert__chev" aria-hidden />
      </button>
      {open && (
        <div className="alert__body">
          <p>{alert.observed}</p>
          {alert.signals.length > 0 && (
            <table className="signals">
              <thead>
                <tr>
                  <th>Señal</th>
                  <th>Valor</th>
                  <th>Fuente</th>
                </tr>
              </thead>
              <tbody>
                {alert.signals.map((s, i) => (
                  <tr key={i}>
                    <td>{s.label}</td>
                    <td className="mono">{s.value}</td>
                    <td>
                      <OriginBadge origin={s.origin} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <dl className="alert__meta">
            <dt>Ventana</dt>
            <dd>{alert.window}</dd>
            <dt>Calidad</dt>
            <dd>{alert.quality ? <QualityTag quality={alert.quality} /> : "No aplica (dato simulado o autorreportado)"}</dd>
            <dt>Acción sugerida</dt>
            <dd>{alert.action}</dd>
          </dl>
          <p className="alert__disclaimer">{alert.disclaimer}</p>
        </div>
      )}
    </li>
  );
}
