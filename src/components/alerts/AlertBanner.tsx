import { ChevronRight } from "lucide-react";
import { SOURCE_LABEL } from "../../features/alerts/alertRules";
import { useHealthStore } from "../../stores/health.store";
import { LevelIcon } from "./LevelIcon";

export function AlertBanner({ onOpen }: { onOpen: () => void }) {
  const top = useHealthStore((s) => s.activeAlerts.find((a) => a.level !== "info"));
  if (!top) return null;

  return (
    <button type="button" className={`banner banner--${top.level}`} onClick={onOpen}>
      <LevelIcon level={top.level} size={18} />
      <span className="banner__title">{top.title}</span>
      <span className="banner__source">{SOURCE_LABEL[top.source]}</span>
      <span className="banner__more">
        Ver detalle <ChevronRight size={14} aria-hidden />
      </span>
    </button>
  );
}
