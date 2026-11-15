import { activeCrew } from "../../data/crew";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { protocolPath } from "../../app/paths";
import { getProtocol, pick } from "../../lib/content";
import { useBuddyStore } from "../../stores/buddy.store";
import { useHealthStore } from "../../stores/health.store";
import type { HeroMood } from "../dashboard/MarsHero";
import { ProtocolRunner } from "./ProtocolRunner";

/**
 * «Qué hacer ahora» junto a la escena principal. En alerta muestra el protocolo enlazado a la
 * alerta más importante (content/alerts.json) en modo «yo solo»; nunca pasos inventados.
 */
export function StepsPanel({ mood, onLogSymptom }: { mood: HeroMood; onLogSymptom: () => void }) {
  const { t, i18n } = useTranslation();
  const lead = useHealthStore((s) => s.activeAlerts.find((a) => a.level !== "info" && a.protocolId));
  const askForHelp = useBuddyStore((s) => s.askForHelp);
  const outgoing = useBuddyStore((s) => s.outgoing);
  const protocol = mood === "alert" && lead?.protocolId ? getProtocol(lead.protocolId) : undefined;

  if (!protocol) {
    return (
      <aside className="steps steps--calm" aria-labelledby="steps-title">
        <h2 id="steps-title" className="steps__title">
          {mood === "calm" ? t("steps.calmTitle") : t("steps.watchTitle")}
        </h2>
        <p className="steps__lead">{mood === "calm" ? t("steps.calmLead") : t("steps.watchLead")}</p>
        {lead?.protocolId && (
          <Link className="steps__full" to={protocolPath(lead.protocolId, i18n.language)}>
            {t("steps.relatedProtocol")}
          </Link>
        )}
        <div className="steps__spacer" />
        <button type="button" className="mbtn mbtn--ghost" onClick={onLogSymptom}>
          {t("steps.logSymptom")}
        </button>
      </aside>
    );
  }

  const title = pick(protocol.title, i18n.language);
  const sent = !!outgoing && !outgoing.acknowledgedAt;

  return (
    <aside className="steps" aria-labelledby="steps-title">
      <div className="steps__head">
        <h2 id="steps-title" className="steps__title">
          {title}
        </h2>
        <Link className="steps__full" to={protocolPath(protocol.id, i18n.language)}>
          {t("steps.fullProtocol")}
        </Link>
      </div>

      <ProtocolRunner key={protocol.id} protocol={protocol} mode="solo" compact />

      <div className="steps__spacer" />
      <button
        type="button"
        className="mbtn mbtn--amber"
        disabled={sent}
        onClick={() => askForHelp(false, activeCrew().name, { protocolId: protocol.id, reason: lead?.title ?? title })}
      >
        {sent ? t("steps.helpSent") : t("steps.needHelp")}
      </button>
      <button type="button" className="mbtn mbtn--ghost" onClick={onLogSymptom}>
        {t("steps.logSymptom")}
      </button>
    </aside>
  );
}
