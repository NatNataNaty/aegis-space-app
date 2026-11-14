import { CameraOff, LoaderCircle, ScanFace, ShieldCheck } from "lucide-react";
import { ocularSession } from "../../features/camera/ocularSession";
import { fmtClock } from "../../lib/format";
import { useCameraStore } from "../../stores/camera.store";

export function CameraIdle() {
  const status = useCameraStore((s) => s.status);
  const error = useCameraStore((s) => s.error);
  const modelState = useCameraStore((s) => s.modelState);
  const lastReadingAt = useCameraStore((s) => s.lastReadingAt);

  if (status === "starting") {
    return (
      <div className="stage-msg">
        <LoaderCircle size={28} className="spin" aria-hidden />
        <p>{modelState === "loading" ? "Cargando modelo local de visión…" : "Solicitando acceso a la cámara…"}</p>
      </div>
    );
  }

  if (status === "error" && error) {
    return (
      <div className="stage-msg stage-msg--error" role="alert">
        <CameraOff size={28} aria-hidden />
        <p>{error.message}</p>
        <button type="button" className="btn btn--primary" onClick={() => void ocularSession.start()}>
          Reintentar
        </button>
      </div>
    );
  }

  if (status === "paused") {
    return (
      <div className="stage-msg">
        <CameraOff size={28} aria-hidden />
        <p>Cámara en pausa. Pistas de vídeo liberadas.</p>
        {lastReadingAt && <span className="stage-msg__sub">Última lectura {fmtClock(lastReadingAt)}</span>}
      </div>
    );
  }

  return (
    <div className="stage-msg">
      <ScanFace size={32} aria-hidden />
      <p>Activa la cámara para iniciar una sesión de observación ocular.</p>
      <span className="stage-msg__sub">
        <ShieldCheck size={13} aria-hidden /> Los frames se procesan en este dispositivo y no se guardan.
      </span>
    </div>
  );
}
