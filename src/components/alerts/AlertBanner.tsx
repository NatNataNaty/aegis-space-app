import { ChevronRight } from "lucide-react";
import { useHealthStore } from "../../stores/health.store";
import { LevelIcon } from "./LevelIcon";
import { useTranslation } from "react-i18next";

export function AlertBanner({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation();
  const top = useHealthStore((s) => s.activeAlerts.find((a) => a.level !== "info"));
  if (!top) return null;

  return (
    <button type="button" className={`banner banner--${top.level}`} onClick={onOpen}>
      <LevelIcon level={top.level} size={18} />
      <span className="banner__title">{top.title}</span>
      <span className="banner__source">{t(`alerts.sourceLabel.${top.source}`)}</span>
      <span className="banner__more">
        {t("alerts.viewDetail")} <ChevronRight size={14} aria-hidden />
      </span>
    </button>
  );
}
