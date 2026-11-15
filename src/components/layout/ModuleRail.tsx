import {
  Activity,
  Bell,
  BookOpen,
  ClipboardList,
  Moon,
  ScanFace,
  Sparkles,
  Sun,
  TriangleAlert,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import { AegisMark } from "../space/Starfield";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { cx } from "../../lib/format";
import { useCameraStore } from "../../stores/camera.store";
import { useHealthStore } from "../../stores/health.store";

export type ModuleId = "vitals" | "face" | "log" | "alerts" | "hazards" | "radiation" | "sleep" | "assistant" | "how";

/** Los tres bloques del menú del diseño: vigilar, actuar y la misión. */
const GROUPS: { id: "watch" | "guide" | "mission"; items: { id: ModuleId; Icon: LucideIcon }[] }[] = [
  {
    id: "watch",
    items: [
      { id: "vitals", Icon: Activity },
      { id: "face", Icon: ScanFace },
      { id: "log", Icon: ClipboardList },
    ],
  },
  {
    id: "guide",
    items: [
      { id: "alerts", Icon: Bell },
      { id: "hazards", Icon: BookOpen },
    ],
  },
  {
    id: "mission",
    items: [
      { id: "radiation", Icon: Sun },
      { id: "sleep", Icon: Moon },
    ],
  },
];

export const MODULES: ModuleId[] = GROUPS.flatMap((g) => g.items.map((i) => i.id));

export function ModuleRail({ current, onChange }: { current: ModuleId; onChange: (m: ModuleId) => void }) {
  const { t } = useTranslation();
  const alertCount = useHealthStore((s) => s.activeAlerts.filter((a) => a.level !== "info").length);
  const camActive = useCameraStore((s) => s.status === "active");

  return (
    <nav className="rail" aria-label={t("modules.aria")}>
      <span className="rail__brand">
        <AegisMark /> aegis
      </span>
      <div className="rail__modules">
        {GROUPS.map((g) => (
          <div key={g.id} role="group" aria-labelledby={`rail-g-${g.id}`} className="rail__block">
            <span id={`rail-g-${g.id}`} className="rail__group">
              {t(`modules.group.${g.id}`)}
            </span>
            {g.items.map(({ id, Icon }) => (
              <button
                key={id}
                type="button"
                className={cx("rail__item", current === id && "rail__item--on")}
                aria-current={current === id ? "page" : undefined}
                onClick={() => onChange(id)}
              >
                <Icon size={20} strokeWidth={1.8} aria-hidden />
                <span className="rail__label">{t(`modules.${id}`)}</span>
                {id === "alerts" && alertCount > 0 && <span className="rail__badge">{alertCount}</span>}
                {id === "face" && camActive && <span className="pulse-dot" aria-label={t("modules.hint.camOn")} />}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="rail__spacer" />

      <button
        type="button"
        className={cx("rail__how", current === "how" && "rail__how--on")}
        aria-current={current === "how" ? "page" : undefined}
        onClick={() => onChange("how")}
      >
        <Waypoints size={18} aria-hidden />
        {t("modules.how")}
      </button>
      <button
        type="button"
        className={cx("rail__assist", current === "assistant" && "rail__assist--on")}
        aria-current={current === "assistant" ? "page" : undefined}
        onClick={() => onChange("assistant")}
      >
        <Sparkles size={18} aria-hidden />
        {t("modules.assistant")}
      </button>
      <Link to="/emergencia" className="rail__emergency">
        <TriangleAlert size={20} aria-hidden />
        {t("nav.emergency")}
      </Link>
    </nav>
  );
}
