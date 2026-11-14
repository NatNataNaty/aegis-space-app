import { CircleCheck, CircleExclamationPoint, CircleSlash, TriangleExclamationPoint } from "lucide-react";
import type { Quality } from "../../features/camera/camera.types";
import type { SimStatus } from "../../features/simulation/simulation.types";

const SIM: Record<SimStatus, { label: string; Icon: typeof CircleCheck; tone: string }> = {
  stable: { label: "Estable", Icon: CircleCheck, tone: "ok" },
  watch: { label: "Seguimiento", Icon: CircleExclamationPoint, tone: "warn" },
  variation: { label: "Variación", Icon: TriangleExclamationPoint, tone: "alert" },
};

const QUALITY: Record<Quality, { label: string; Icon: typeof CircleCheck; tone: string }> = {
  good: { label: "Calidad buena", Icon: CircleCheck, tone: "ok" },
  limited: { label: "Calidad limitada", Icon: CircleExclamationPoint, tone: "warn" },
  unavailable: { label: "No disponible", Icon: CircleSlash, tone: "muted" },
};

export function SimStatusTag({ status }: { status: SimStatus }) {
  const { label, Icon, tone } = SIM[status];
  return (
    <span className={`tag tag--${tone}`}>
      <Icon size={12} aria-hidden />
      {label}
    </span>
  );
}

export function QualityTag({ quality, short = false }: { quality: Quality; short?: boolean }) {
  const { label, Icon, tone } = QUALITY[quality];
  return (
    <span className={`tag tag--${tone}`}>
      <Icon size={12} aria-hidden />
      {short ? label.replace("Calidad ", "") : label}
    </span>
  );
}
