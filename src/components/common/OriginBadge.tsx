import { ClipboardList, Cpu, Radio, Timer } from "lucide-react";
import type { DataOrigin } from "../../features/camera/camera.types";
import { useTranslation } from "react-i18next";

// Etiquetas en i18n: origin.<id>
const ORIGIN_ICON: Record<DataOrigin, typeof Radio> = {
  camera_live: Radio,
  simulated: Cpu,
  user_reported: ClipboardList,
  local_test: Timer,
};

export function OriginBadge({ origin, stale = false }: { origin: DataOrigin; stale?: boolean }) {
  const { t } = useTranslation();
  const Icon = ORIGIN_ICON[origin];
  // Los datos del escenario de demostración no llevan etiqueta en cada tarjeta (se explica en la exposición
  // y en el pie de página). Sí se marcan lo EN VIVO, lo AUTORREPORTADO y la PRUEBA LOCAL.
  if (origin === "simulated") return null;
  if (stale) {
    return (
      <span className="badge badge--stale" title={t("origin.staleTitle")}>
        <Icon size={11} aria-hidden />
        {t("origin.stale")}
      </span>
    );
  }
  return (
    <span className={`badge badge--${origin}`}>
      <Icon size={11} aria-hidden />
      {t(`origin.${origin}`)}
    </span>
  );
}
