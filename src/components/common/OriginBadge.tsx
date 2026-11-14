import { ClipboardList, Cpu, Radio, Timer } from "lucide-react";
import type { DataOrigin } from "../../features/camera/camera.types";

const ORIGIN: Record<DataOrigin, { label: string; Icon: typeof Radio }> = {
  camera_live: { label: "EN VIVO", Icon: Radio },
  simulated: { label: "SIMULADO", Icon: Cpu },
  user_reported: { label: "AUTORREPORTADO", Icon: ClipboardList },
  local_test: { label: "PRUEBA LOCAL", Icon: Timer },
};

export function OriginBadge({ origin, stale = false }: { origin: DataOrigin; stale?: boolean }) {
  const { label, Icon } = ORIGIN[origin];
  if (stale) {
    return (
      <span className="badge badge--stale" title="Última lectura antes de pausar la cámara">
        <Icon size={11} aria-hidden />
        LECTURA ANTERIOR
      </span>
    );
  }
  return (
    <span className={`badge badge--${origin}`}>
      <Icon size={11} aria-hidden />
      {label}
    </span>
  );
}
