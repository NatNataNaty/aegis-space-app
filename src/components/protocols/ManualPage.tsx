import { ArrowLeft, BookOpenCheck, Siren, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { protocolPath, ROUTES } from "../../app/paths";
import { activeCrew } from "../../data/crew";
import { getProtocol, pick, riskById } from "../../lib/content";
import { useBuddyStore } from "../../stores/buddy.store";
import { PreventionList } from "../common/PreventionList";
import { PageShell } from "../layout/PageShell";

/**
 * /:lang/manual/:id — «Manual médico de a bordo» de un protocolo.
 * Reúne lo que aegis puede respaldar con fuentes (qué hacer ya, cuándo escalar, cómo prevenirlo,
 * qué es el riesgo). El procedimiento clínico validado (fármacos, dosis, maniobras) lo carga el
 * equipo médico de la misión: aquí queda marcado como PENDIENTE DE REVISIÓN MÉDICA, nunca inventado.
 */
export function ManualPage() {
  const { id = "" } = useParams();
  const { t, i18n } = useTranslation();
  const askForHelp = useBuddyStore((s) => s.askForHelp);
  const protocol = getProtocol(id);
  const lang = i18n.language;

  if (!protocol) {
    return (
      <PageShell title={t("protocol.notFoundTitle")}>
        <p>{t("protocol.notFound", { id })}</p>
      </PageShell>
    );
  }

  const title = pick(protocol.title, lang);
  const risk = protocol.riskId ? riskById(protocol.riskId) : undefined;
  const manual = protocol.manual;
  const related = protocol.id === "no-responde" ? undefined : protocol.id === "dolor-pecho-respirar" ? "no-responde" : "dolor-pecho-respirar";

  return (
    <PageShell title={t("manual.title", { name: title })}>
      <div className="manual">
        <Link className="dbtn manual__back" to={protocolPath(protocol.id, lang)}>
          <ArrowLeft size={16} aria-hidden /> {t("manual.back")}
        </Link>

        {manual && (
          <section className="manual__alarm" aria-labelledby="manual-signs">
            <h2 id="manual-signs">
              <TriangleAlert size={22} aria-hidden /> {t("manual.signsTitle")}
            </h2>
            <ul>
              {manual.signs.map((x, i) => (
                <li key={i}>{pick(x, lang)}</li>
              ))}
            </ul>
            <div className="manual__actions">
              <button type="button" className="dbtn dbtn--danger" onClick={() => askForHelp(false, activeCrew().name, { protocolId: protocol.id, reason: title })}>
                {t("manual.askOfficer")}
              </button>
              <Link className="dbtn" to={ROUTES.emergency}>
                <Siren size={16} aria-hidden /> {t("nav.emergency")}
              </Link>
            </div>
          </section>
        )}

        {manual && (
          <section className="panel" aria-labelledby="manual-do">
            <h2 id="manual-do">
              <BookOpenCheck size={22} aria-hidden /> {t("manual.doTitle")}
            </h2>
            <ol className="manual__do">
              {manual.actions.map((x, i) => (
                <li key={i}>
                  <span className="manual__n" aria-hidden>
                    {i + 1}
                  </span>
                  <span>{pick(x, lang)}</span>
                </li>
              ))}
            </ol>
            <p className="manual__review">{t("manual.reviewNote")}</p>
            {related && (
              <Link className="step__link" to={protocolPath(related, lang)}>
                {t("manual.related", { name: pick(getProtocol(related)!.title, lang) })}
              </Link>
            )}
          </section>
        )}


        {risk && (
          <section className="panel" aria-labelledby="manual-risk">
            <h2 id="manual-risk">{t("manual.riskTitle", { name: pick(risk.name, lang) })}</h2>
            <p>{pick(risk.summary, lang)}</p>
            <PreventionList risk={risk} headingLevel={3} />
          </section>
        )}
      </div>
    </PageShell>
  );
}
