import { CircleCheck, CircleExclamationPoint, CircleSlash, TriangleExclamationPoint } from "lucide-react";
import type { Quality } from "../../features/camera/camera.types";
import type { SimStatus } from "../../features/simulation/simulation.types";
import { useTranslation } from "react-i18next";

const SIM: Record<SimStatus, { Icon: typeof CircleCheck; tone: string }> = {
  stable: { Icon: CircleCheck, tone: "ok" },
  watch: { Icon: CircleExclamationPoint, tone: "warn" },
  variation: { Icon: TriangleExclamationPoint, tone: "alert" },
};

const QUALITY: Record<Quality, { Icon: typeof CircleCheck; tone: string }> = {
  good: { Icon: CircleCheck, tone: "ok" },
  limited: { Icon: CircleExclamationPoint, tone: "warn" },
  unavailable: { Icon: CircleSlash, tone: "muted" },
};

export function SimStatusTag({ status }: { status: SimStatus }) {
  const { t } = useTranslation();
  const { Icon, tone } = SIM[status];
  return (
    <span className={`tag tag--${tone}`}>
      <Icon size={12} aria-hidden />
      {t(`simStatus.${status}`)}
    </span>
  );
}

export function QualityTag({ quality, short = false }: { quality: Quality; short?: boolean }) {
  const { t } = useTranslation();
  const { Icon, tone } = QUALITY[quality];
  return (
    <span className={`tag tag--${tone}`}>
      <Icon size={12} aria-hidden />
      {t(short ? `quality.short.${quality}` : `quality.${quality}`)}
    </span>
  );
}
