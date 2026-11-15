import { ArrowDown } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { protocolPath } from "../../../app/paths";
import { EARTH_BENEFITS, HAZARDS, HRP_RESEARCH_URL, HRP_RISKS_URL, pick, PROTOCOLS, RISKS, STUDIES } from "../../../lib/content";
import { cx } from "../../../lib/format";
import { PreventionList } from "../../common/PreventionList";
import { SourceCite } from "../../common/SourceCite";
import type { HazardId, RiskCategory } from "../../../lib/schemas/content";

const CATEGORIES: RiskCategory[] = ["physiology", "behavior", "radiation"];

function Source({ href, label }: { href: string; label: string }) {
  return <SourceCite label={label} url={href} />;
}

/** Los 5 peligros (RIDGE) y los 17 riesgos de NASA HRP, empaquetados en la app (sin red). */
export function LibrarySection() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [category, setCategory] = useState<RiskCategory | "all">("all");
  const [hazard, setHazard] = useState<HazardId | "all">("all");

  const risks = RISKS.filter((r) => (category === "all" || r.category === category) && (hazard === "all" || r.hazardIds.includes(hazard)));

  return (
    <div className="library">
      <section aria-labelledby="hazards-title">
        <header className="library__head">
          <h2 id="hazards-title">{t("library.hazardsTitle")}</h2>
          <p className="panel__sub">{t("library.hazardsSub")}</p>
        </header>
        <ul className="hazards">
          {HAZARDS.map((h) => (
            <li key={h.id} className="hazard">
              <span className="hazard__letter" aria-hidden>
                {h.letter}
              </span>
              <h3 className="hazard__name">{pick(h.name, lang)}</h3>
              <p>{pick(h.summary, lang)}</p>
              <p className="hazard__fact">{pick(h.fact, lang)}</p>
              <div className="hazard__links">
                <Source href={h.factSourceUrl} label={h.factSourceUrl.includes("asc-csa") ? "CSA" : "NASA HRP"} />
                <button
                  type="button"
                  className={cx("chip-btn", hazard === h.id && "chip-btn--on")}
                  aria-pressed={hazard === h.id}
                  onClick={() => {
                    const next = hazard === h.id ? "all" : h.id;
                    setHazard(next);
                    // Lleva a la lista ya filtrada: así se ve qué riesgos produce este peligro.
                    if (next !== "all") requestAnimationFrame(() => document.getElementById("risks-title")?.scrollIntoView({ behavior: "smooth", block: "start" }));
                  }}
                >
                  {t("library.seeRisksN", { count: RISKS.filter((r) => r.hazardIds.includes(h.id)).length })} <ArrowDown size={14} aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="risks-title">
        <header className="library__head">
          <h2 id="risks-title">{t("library.risksTitle")}</h2>
          <p className="panel__sub">
            {t("library.risksSub")} <Source href={HRP_RISKS_URL} label="NASA HRP" />
          </p>
        </header>

        <div className="filters" role="group" aria-label={t("library.filter")}>
          <button type="button" className={cx("chip-btn", category === "all" && "chip-btn--on")} aria-pressed={category === "all"} onClick={() => setCategory("all")}>
            {t("library.all")} ({RISKS.length})
          </button>
          {CATEGORIES.map((c) => (
            <button key={c} type="button" className={cx("chip-btn", category === c && "chip-btn--on")} aria-pressed={category === c} onClick={() => setCategory(c)}>
              {t(`library.category.${c}`)} ({RISKS.filter((r) => r.category === c).length})
            </button>
          ))}
          {hazard !== "all" && (
            <button type="button" className="chip-btn chip-btn--on" onClick={() => setHazard("all")}>
              {pick(HAZARDS.find((h) => h.id === hazard)!.name, lang)} ✕
            </button>
          )}
        </div>
        <p className="muted" aria-live="polite">
          {t("library.showing", { n: risks.length })}
        </p>

        <ul className="risks">
          {risks.map((r) => {
            const studies = STUDIES.filter((s) => s.riskIds.includes(r.id));
            const benefits = EARTH_BENEFITS.filter((b) => b.riskIds.includes(r.id));
            const protocols = PROTOCOLS.filter((p) => p.riskId === r.id);
            return (
              <li key={r.id} className="risk">
                <details>
                  <summary className="risk__summary">
                    <span className={`risk__cat risk__cat--${r.category}`}>{t(`library.category.${r.category}`)}</span>
                    <span className="risk__name">{pick(r.name, lang)}</span>
                  </summary>
                  <div className="risk__body">
                    <p>{pick(r.summary, lang)}</p>
                    <p className="muted">
                      {t("library.hazards")}: {r.hazardIds.map((id) => pick(HAZARDS.find((h) => h.id === id)!.name, lang)).join(" · ")}
                    </p>
                    {protocols.length > 0 && (
                      <p>
                        {protocols.map((p) => (
                          <Link key={p.id} className="mbtn mbtn--dark risk__protocol" to={protocolPath(p.id, lang)}>
                            {t("library.openProtocol", { name: pick(p.title, lang) })}
                          </Link>
                        ))}
                      </p>
                    )}
                    {studies.length > 0 && (
                      <>
                        <h4 className="subhead">{t("library.studies")}</h4>
                        <ul className="risk__list">
                          {studies.map((s) => (
                            <li key={s.id}>
                              <strong>{s.name}</strong> <span className="muted">({t(`library.mission.${s.mission}`)})</span> — {pick(s.summary, lang)}{" "}
                              <Source href={s.sourceUrl} label="NASA" />
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    {benefits.length > 0 && (
                      <>
                        <h4 className="subhead">{t("library.earth")}</h4>
                        <ul className="risk__list">
                          {benefits.map((b) => (
                            <li key={b.id}>
                              {pick(b.text, lang)} <Source href={b.sourceUrl} label="CSA" />
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    <PreventionList risk={r} />
                    <p>
                      <Source href={r.sourceUrl} label={t("library.officialPage")} />
                    </p>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
        <p className="muted">
          {t("library.mappingNote")} <Source href={HRP_RESEARCH_URL} label={t("library.research")} />
        </p>
        <p className="muted">{t("library.offlineNote")}</p>
      </section>
    </div>
  );
}
