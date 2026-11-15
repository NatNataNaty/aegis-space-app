import { ExternalLink, UserRoundPlus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ROUTES } from "../../app/paths";
import { getProtocol, HRP_RISKS_URL, pick, riskById } from "../../lib/content";
import { fmtNum } from "../../lib/format";
import { useBuddyStore } from "../../stores/buddy.store";
import { useHealthStore } from "../../stores/health.store";
import { OriginBadge } from "../common/OriginBadge";
import { PageShell } from "../layout/PageShell";
import { ProtocolRunner, type RunMode } from "./ProtocolRunner";

/** /:lang/protocolos/:id — pasos numerados, modo «yo solo» y «con compañero». */
export function ProtocolPage() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const { t, i18n } = useTranslation();
  const protocol = getProtocol(id);
  const askForHelp = useBuddyStore((s) => s.askForHelp);
  const vitals = useHealthStore((s) => s.snapshot.vitals);
  const [mode, setMode] = useState<RunMode | null>(params.get("modo") === "companero" ? "buddy" : null);

  if (!protocol) {
    return (
      <PageShell title={t("protocol.notFoundTitle")}>
        <p>{t("protocol.notFound", { id })}</p>
        <Link className="mbtn mbtn--amber" to={ROUTES.emergency}>
          {t("emergency.open")}
        </Link>
      </PageShell>
    );
  }

  const lang = i18n.language;
  const title = pick(protocol.title, lang);
  const risk = protocol.riskId ? riskById(protocol.riskId) : undefined;
  const requestBuddy = () => askForHelp(false, t("hero.crewName"), { protocolId: protocol.id, reason: title });

  return (
    <PageShell title={title}>
      <p className="page__pending">{t("medical.pendingReview")}</p>
      <p className="protocol__note">{t("protocol.pendingNote")}</p>

      <div className="protocol">
        <section className="protocol__main" aria-labelledby="protocol-steps">
          {mode === null ? (
            <div className="decision">
              <h2 id="protocol-steps" className="decision__q">
                {t("protocol.decision")}
              </h2>
              <div className="decision__actions">
                <button type="button" className="mbtn mbtn--dark decision__btn" onClick={() => setMode("solo")}>
                  {t("protocol.canSolo")}
                </button>
                <button
                  type="button"
                  className="mbtn mbtn--amber decision__btn"
                  onClick={() => {
                    requestBuddy();
                    setMode("buddy");
                  }}
                >
                  {t("protocol.needBuddy")}
                </button>
                <button type="button" className="mbtn mbtn--ghost decision__btn" onClick={() => setMode("buddy")}>
                  {t("protocol.iAmHelper")}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="seg protocol__modes" role="tablist" aria-label={t("protocol.modeLabel")}>
                {(["solo", "buddy"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={mode === m}
                    className={`seg__btn${mode === m ? " seg__btn--on" : ""}`}
                    onClick={() => setMode(m)}
                  >
                    {t(`protocol.mode.${m}`)}
                  </button>
                ))}
              </div>
              <h2 id="protocol-steps" className="visually-hidden">
                {t(`protocol.mode.${mode}`)}
              </h2>
              <ProtocolRunner key={mode} protocol={protocol} mode={mode} />
            </>
          )}
        </section>

        <aside className="protocol__side">
          <div className="panel">
            <h3>{t("protocol.vitals")}</h3>
            <dl className="protocol__vitals">
              <div>
                <dt>{t("metrics.heartRate")}</dt>
                <dd>
                  {fmtNum(vitals.heartRate.value)} <small>{t("protocol.bpm")}</small>
                </dd>
              </div>
              <div>
                <dt>{t("metrics.spo2")}</dt>
                <dd>
                  {fmtNum(vitals.spo2.value)} <small>%</small>
                </dd>
              </div>
            </dl>
            <OriginBadge origin="simulated" />
          </div>

          <button type="button" className="mbtn mbtn--ghost protocol__buddy" onClick={requestBuddy}>
            <UserRoundPlus size={18} aria-hidden /> {t("protocol.callAnother")}
          </button>

          <div className="panel">
            <h3>{t("protocol.trigger")}</h3>
            <p>{pick(protocol.trigger, lang)}</p>
            <h3>{t("protocol.buddyPolicyTitle")}</h3>
            <p>{t(`protocol.buddyPolicy.${protocol.buddy}`)}</p>
            <h3>{t("protocol.escalate")}</h3>
            <p>{pick(protocol.escalate, lang)}</p>
          </div>

          <div className="panel">
            <h3>{t("protocol.source")}</h3>
            <p>
              <a href={risk?.sourceUrl ?? HRP_RISKS_URL} target="_blank" rel="noreferrer">
                {risk ? pick(risk.name, lang) : t("library.risksTitle")} <ExternalLink size={14} aria-hidden />
              </a>
            </p>
            <p className="muted">{t("library.offlineNote")}</p>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
