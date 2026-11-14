import { ArrowLeft, Siren } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { protocolPath, ROUTES } from "../../app/paths";
import { PROTOCOLS, pick } from "../../lib/content";
import { useBuddyStore } from "../../stores/buddy.store";
import { LanguageSwitch } from "../layout/LanguageSwitch";

/** Orden de la lista: primero lo que más urge cuando no hay nadie a quien llamar. */
const ORDER = [
  "no-responde",
  "falta-oxigeno",
  "frecuencia-cardiaca",
  "radiacion",
  "sintomas-eva",
  "golpe-lesion",
  "mareo",
  "crisis-emocional",
  "agotamiento",
  "vision-cabeza",
];

/**
 * Modo emergencia: alto contraste, botones grandes y cualquier protocolo a ≤ 3 toques
 * (Emergencia → protocolo → primer paso). Pensado para poca luz y manos ocupadas.
 */
export function EmergencyPage() {
  const { t, i18n } = useTranslation();
  const askForHelp = useBuddyStore((s) => s.askForHelp);
  const outgoing = useBuddyStore((s) => s.outgoing);
  const sorted = [...PROTOCOLS].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

  return (
    <div className="emergency">
      <header className="emergency__bar">
        <Link to={ROUTES.panel} className="emergency__back">
          <ArrowLeft size={22} aria-hidden /> {t("nav.back")}
        </Link>
        <LanguageSwitch />
      </header>

      <main className="emergency__main">
        <h1 className="emergency__title">
          <Siren size={36} aria-hidden /> {t("emergency.title")}
        </h1>

        <button
          type="button"
          className="emergency__help"
          disabled={!!outgoing && !outgoing.acknowledgedAt}
          onClick={() => askForHelp(false, t("hero.crewName"), { protocolId: "no-responde", reason: t("emergency.title") })}
        >
          {outgoing && !outgoing.acknowledgedAt ? t("emergency.helpSent") : t("emergency.helpNow")}
        </button>

        <h2 className="emergency__sub">{t("emergency.choose")}</h2>
        <ul className="emergency__grid">
          {sorted.map((p) => (
            <li key={p.id}>
              <Link className="emergency__item" to={protocolPath(p.id, i18n.language)}>
                {pick(p.title, i18n.language)}
              </Link>
            </li>
          ))}
        </ul>
        <p className="emergency__pending">{t("medical.pendingReview")}</p>
      </main>
    </div>
  );
}
