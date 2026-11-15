import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { pick } from "../../lib/content";
import type { Risk } from "../../lib/schemas/content";
import { SourceCite } from "./SourceCite";

/**
 * «Cómo prevenirlo»: contramedidas que NASA describe para un riesgo, en palabras sencillas.
 * Cada punto cita su documento oficial; sin URL propia, la fuente es la página del riesgo.
 */
export function PreventionList({ risk, headingLevel = 4 }: { risk: Risk; headingLevel?: 3 | 4 }) {
  const { t, i18n } = useTranslation();
  if (!risk.prevention?.length) return null;
  const H = headingLevel === 3 ? "h3" : "h4";
  return (
    <section className="prevent" aria-label={t("prevent.title")}>
      <H className="prevent__title">
        <ShieldCheck size={18} aria-hidden /> {t("prevent.title")}
      </H>
      <ul className="prevent__list">
        {risk.prevention.map((p, i) => (
          <li key={i}>
            <span>{pick(p.text, i18n.language)}</span>
            {p.sourceUrl && <SourceCite label={t("prevent.techBrief")} url={p.sourceUrl} compact />}
          </li>
        ))}
      </ul>
      <p className="prevent__note">
        {t("prevent.note")} <SourceCite label={`NASA HRP · ${pick(risk.name, i18n.language)}`} url={risk.sourceUrl} compact />
      </p>
    </section>
  );
}
