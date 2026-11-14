import { CameraOff, Video } from "lucide-react";
import { useCameraStore } from "../../stores/camera.store";
import { useTranslation } from "react-i18next";

export function LiveIndicator({ long = false }: { long?: boolean }) {
  const { t } = useTranslation();
  const status = useCameraStore((s) => s.status);
  const active = status === "active";

  if (!active) {
    return (
      <span className="live live--off">
        <CameraOff size={13} aria-hidden />
        {status === "starting" ? t("camera.live.starting") : status === "paused" ? t("camera.live.paused") : t("camera.live.inactive")}
      </span>
    );
  }
  return (
    <span className="live live--on" role="status">
      <span className="live__dot" aria-hidden />
      <Video size={13} aria-hidden />
      {long ? t("camera.live.activeLong") : t("camera.live.active")}
    </span>
  );
}
