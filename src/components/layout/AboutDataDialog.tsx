import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { OriginBadge } from "../common/OriginBadge";

/** Referencias de todo el contenido médico y espacial (detalle con direcciones en docs/FUENTES.md). */
const REFERENCES = [
  "NASA Human Research Program — Hazards, Risks y Ongoing Research",
  "NASA OCHMO — NASA-STD-3001 Technical Briefs (sueño, radiación, adaptación espacial, hueso)",
  "NASA Human Research Roadmap y NTRS — informes de evidencia",
  "Canadian Space Agency — Radiation monitoring; Bio-Monitor",
  "American Heart Association — Guías 2025 de RCP y señales de infarto",
  "European Resuscitation Council / Resuscitation Council UK — Soporte vital básico 2025",
  "Cruz Roja Americana y St John Ambulance — Hemorragia grave",
  "Organización Mundial de la Salud — Primeros auxilios psicológicos (2011)",
  "FDA — Oxímetros de pulso",
];

export function AboutDataDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const limits = t("about.limits", { returnObjects: true }) as string[];
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="about-title"
    >
      <div className="dialog__inner">
        <header className="dialog__head">
          <h2 id="about-title">{t("about.title")}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t("about.close")}>
            <X size={18} />
          </button>
        </header>

        <section className="about-row">
          <OriginBadge origin="camera_live" />
          <p>{t("about.camera")}</p>
        </section>
        <section className="about-row">
          <OriginBadge origin="simulated" />
          <p>{t("about.simulated")}</p>
        </section>
        <section className="about-row">
          <OriginBadge origin="user_reported" />
          <p>{t("about.userReported")}</p>
        </section>
        <section className="about-row">
          <OriginBadge origin="local_test" />
          <p>{t("about.localTest")}</p>
        </section>

        <div className="about-limits">
          <h3>{t("about.limitsTitle")}</h3>
          <ul>
            {limits.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="about-limits">
          <h3>{t("about.refsTitle")}</h3>
          <ul className="about-refs">
            {REFERENCES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      </div>
    </dialog>
  );
}
