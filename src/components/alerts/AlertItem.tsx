import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { Alert } from "../../features/alerts/alert.types";
import { cx } from "../../lib/format";
import { OriginBadge } from "../common/OriginBadge";
import { QualityTag } from "../common/StatusTag";
import { LevelIcon } from "./LevelIcon";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { protocolPath } from "../../app/paths";
import { getProtocol, pick } from "../../lib/content";
import { useHealthStore } from "../../stores/health.store";

export function AlertItem({ alert, defaultOpen = false }: { alert: Alert; defaultOpen?: boolean }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  const protocol = alert.protocolId ? getProtocol(alert.protocolId) : undefined;
  const attend = () => useHealthStore.getState().attendAlerts((a) => a.id === alert.id);

  return (
    <li className={cx("alert", `alert--${alert.level}`, open && "alert--open")}>
      <button type="button" className="alert__summary" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <LevelIcon level={alert.level} />
        <span className="alert__title">{alert.title}</span>
        <span className={`alert__level alert__level--${alert.level}`}>{t(`alerts.level.${alert.level}`)}</span>
        <span className="alert__source">{t(`alerts.sourceLabel.${alert.source}`)}</span>
        <ChevronDown size={16} className="alert__chev" aria-hidden />
      </button>
      {open && (
        <div className="alert__body">
          <p>{alert.observed}</p>
          {alert.signals.length > 0 && (
            <table className="signals">
              <thead>
                <tr>
                  <th>{t("alerts.signal")}</th>
                  <th>{t("alerts.value")}</th>
                  <th>{t("alerts.source")}</th>
                </tr>
              </thead>
              <tbody>
                {alert.signals.map((s, i) => (
                  <tr key={i}>
                    <td>{s.label}</td>
                    <td>{s.value}</td>
                    <td>
                      <OriginBadge origin={s.origin} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <dl className="alert__meta">
            <dt>{t("alerts.window")}</dt>
            <dd>{alert.window}</dd>
            <dt>{t("alerts.quality")}</dt>
            <dd>{alert.quality ? <QualityTag quality={alert.quality} /> : t("alerts.qualityNa")}</dd>
            <dt>{t("alerts.action")}</dt>
            <dd>{alert.action}</dd>
          </dl>
          {protocol && (
            <Link className="mbtn mbtn--amber alert__protocol" to={protocolPath(protocol.id, i18n.language)}>
              {t("library.openProtocol", { name: pick(protocol.title, i18n.language) })}
            </Link>
          )}
          {alert.level !== "info" && (
            <button type="button" className="mbtn mbtn--ghost alert__attend" onClick={attend}>
              <Check size={16} aria-hidden /> {t("alerts.attend")}
            </button>
          )}
          <p className="alert__disclaimer">{alert.disclaimer}</p>
        </div>
      )}
    </li>
  );
}
