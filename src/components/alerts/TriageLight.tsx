import { ChevronRight, Siren } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { protocolPath, ROUTES } from "../../app/paths";
import { lightFor, type Light } from "../../features/alerts/triage";
import { pick, PROTOCOLS } from "../../lib/content";
import { cx } from "../../lib/format";
import { useHealthStore } from "../../stores/health.store";

const LIGHTS: Light[] = ["green", "yellow", "red"];

/**
 * Semáforo siempre visible en «Signos vitales»: dice en qué color está el tripulante
 * y qué hacer ahora, con el protocolo paso a paso a un toque.
 * Los colores salen del motor de alertas (rango personal), no de umbrales clínicos.
 */
export function TriageLight({ onOpenAlerts }: { onOpenAlerts: () => void }) {
  const { t, i18n } = useTranslation();
  const top = useHealthStore((s) => s.activeAlerts.find((a) => a.level !== "info"));
  const light = lightFor(top?.level ?? null);
  const protocol = top?.protocolId ? PROTOCOLS.find((p) => p.id === top.protocolId) : undefined;

  return (
    <section className={cx("triage", `triage--${light}`)} aria-labelledby="triage-title" aria-live="polite">
      <ol className="triage__lamps" aria-hidden>
        {LIGHTS.map((l) => (
          <li key={l} className={cx("triage__lamp", `triage__lamp--${l}`, l === light && "triage__lamp--on")}>
            <span className="triage__bulb" />
            <span className="triage__name">{t(`triage.${l}.name`)}</span>
          </li>
        ))}
      </ol>

      <div className="triage__body">
        <h2 id="triage-title" className="triage__title">
          <span className="sr-only">{t("triage.srNow")} </span>
          {t(`triage.${light}.title`)}
        </h2>
        <p className="triage__why">{top ? top.title : t("triage.green.why")}</p>
        <p className="triage__do">{t(`triage.${light}.do`)}</p>

        <div className="triage__actions">
          {protocol && light !== "green" ? (
            <Link className={cx("dbtn", light === "red" ? "dbtn--danger" : "dbtn--primary")} to={protocolPath(protocol.id, i18n.language)}>
              {t("triage.openProtocol", { name: pick(protocol.title, i18n.language) })} <ChevronRight size={16} aria-hidden />
            </Link>
          ) : light === "red" ? (
            <Link className="dbtn dbtn--danger" to={ROUTES.emergency}>
              <Siren size={16} aria-hidden /> {t("nav.emergency")}
            </Link>
          ) : null}
          {top && (
            <button type="button" className="dbtn" onClick={onOpenAlerts}>
              {t("alerts.viewDetail")}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
