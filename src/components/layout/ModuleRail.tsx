import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { cx } from "../../lib/format";
import { useCameraStore } from "../../stores/camera.store";
import { useHealthStore } from "../../stores/health.store";

export type ModuleId = "vitals" | "eye" | "log" | "alerts" | "hazards" | "radiation" | "sleep";

export const MODULES: ModuleId[] = ["vitals", "eye", "log", "alerts", "hazards", "radiation", "sleep"];

export function ModuleRail({ current, onChange }: { current: ModuleId; onChange: (m: ModuleId) => void }) {
  const { t } = useTranslation();
  const alertCount = useHealthStore((s) => s.activeAlerts.filter((a) => a.level !== "info").length);
  const camStatus = useCameraStore((s) => s.status);

  // Estado corto junto a cada módulo: información útil, no decoración.
  const hint: Partial<Record<ModuleId, string>> = {
    eye: camStatus === "active" ? t("modules.hint.camOn") : t("modules.hint.camOff"),
  };

  return (
    <nav className="rail" aria-label={t("modules.aria")}>
      <span className="rail__brand">aegis</span>
      {MODULES.map((m) => (
        <button
          key={m}
          type="button"
          className={cx("rail__item", current === m && "rail__item--on")}
          aria-current={current === m ? "page" : undefined}
          onClick={() => onChange(m)}
        >
          <span>{t(`modules.${m}`)}</span>
          {(m === "vitals" || m === "alerts") && alertCount > 0 ? (
            <span className="rail__badge">{alertCount}</span>
          ) : hint[m] ? (
            <span className="rail__hint">{hint[m]}</span>
          ) : null}
        </button>
      ))}
      <div className="rail__spacer" />
      <div className="rail__assistant">
        <span className="rail__assistant-title">{t("modules.assistant")}</span>
        <span className="rail__assistant-sub">{t("modules.assistantSub")}</span>
      </div>
      <Link to="/emergencia" className="rail__emergency">
        {t("nav.emergency")}
      </Link>
    </nav>
  );
}
