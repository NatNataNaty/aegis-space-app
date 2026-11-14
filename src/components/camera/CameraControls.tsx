import { Eye, EyeOff, Layers, Maximize2, Minimize2, Pause, Play, RotateCcw } from "lucide-react";
import { ocularSession } from "../../features/camera/ocularSession";
import { cx } from "../../lib/format";
import { useCameraStore } from "../../stores/camera.store";

export function CameraControls() {
  const view = useCameraStore((s) => s.view);
  const status = useCameraStore((s) => s.status);
  const showOverlay = useCameraStore((s) => s.showOverlay);
  const setView = useCameraStore((s) => s.setView);
  const toggleOverlay = useCameraStore((s) => s.toggleOverlay);
  const active = status === "active";
  const starting = status === "starting";
  const compact = view !== "expanded";

  return (
    <div className={cx("controls", compact && "controls--compact")} role="toolbar" aria-label="Controles de cámara">
      {active || starting ? (
        <button
          type="button"
          className="btn btn--danger"
          onClick={() => ocularSession.pause()}
          disabled={starting}
          title="Apagar la cámara y detener el análisis"
        >
          <Pause size={16} aria-hidden />
          <span className="btn__label">Pausar</span>
        </button>
      ) : (
        <button type="button" className="btn btn--primary" onClick={() => void ocularSession.start()}>
          <Play size={16} aria-hidden />
          <span className="btn__label">{status === "paused" ? "Reanudar" : "Iniciar"}</span>
        </button>
      )}

      {view === "expanded" ? (
        <button type="button" className="btn" onClick={() => setView("minimized")} title="Minimizar sin detener el análisis">
          <Minimize2 size={16} aria-hidden />
          <span className="btn__label">Minimizar</span>
        </button>
      ) : (
        <button type="button" className="btn" onClick={() => setView("expanded")} title="Expandir la cámara">
          <Maximize2 size={16} aria-hidden />
          <span className="btn__label">Expandir</span>
        </button>
      )}

      {view === "metrics_only" ? (
        <button type="button" className="btn" onClick={() => setView("minimized")} title="Mostrar el vídeo">
          <Eye size={16} aria-hidden />
          <span className="btn__label">Mostrar vídeo</span>
        </button>
      ) : (
        <button
          type="button"
          className="btn"
          onClick={() => setView("metrics_only")}
          title="Ocultar el vídeo y mantener el análisis activo"
        >
          <EyeOff size={16} aria-hidden />
          <span className="btn__label">Ocultar vídeo</span>
        </button>
      )}

      {view === "expanded" && (
        <>
          <button
            type="button"
            className="btn"
            onClick={() => ocularSession.recalibrate()}
            disabled={!active}
            title="Repetir la calibración ocular"
          >
            <RotateCcw size={16} aria-hidden />
            <span className="btn__label">Recalibrar</span>
          </button>
          <button
            type="button"
            className={cx("btn btn--icon", showOverlay && "btn--on")}
            onClick={toggleOverlay}
            aria-pressed={showOverlay}
            title={showOverlay ? "Ocultar puntos faciales" : "Mostrar puntos faciales"}
          >
            <Layers size={16} aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}
