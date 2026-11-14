import { CameraOff, Video } from "lucide-react";
import { useCameraStore } from "../../stores/camera.store";

export function LiveIndicator({ long = false }: { long?: boolean }) {
  const status = useCameraStore((s) => s.status);
  const active = status === "active";

  if (!active) {
    return (
      <span className="live live--off">
        <CameraOff size={13} aria-hidden />
        {status === "starting" ? "INICIANDO" : status === "paused" ? "CÁMARA EN PAUSA" : "CÁMARA INACTIVA"}
      </span>
    );
  }
  return (
    <span className="live live--on" role="status">
      <span className="live__dot" aria-hidden />
      <Video size={13} aria-hidden />
      {long ? "CÁMARA ACTIVA — PROCESAMIENTO LOCAL" : "CÁMARA ACTIVA"}
    </span>
  );
}
