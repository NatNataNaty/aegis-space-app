import { Eye, EyeOff, Layers, Maximize2, Minimize2, Pause, Play, RotateCcw } from "lucide-react";
import { ocularSession } from "../../features/camera/ocularSession";
import { cx } from "../../lib/format";
import { useCameraStore } from "../../stores/camera.store";
import { useTranslation } from "react-i18next";

export function CameraControls() {
  const { t } = useTranslation();
  const view = useCameraStore((s) => s.view);
  const status = useCameraStore((s) => s.status);
  const showOverlay = useCameraStore((s) => s.showOverlay);
  const setView = useCameraStore((s) => s.setView);
  const toggleOverlay = useCameraStore((s) => s.toggleOverlay);
  const active = status === "active";
  const starting = status === "starting";
  const compact = view !== "expanded";

  return (
    <div className={cx("controls", compact && "controls--compact")} role="toolbar" aria-label={t("camera.controls")}>
      {active || starting ? (
        <button
          type="button"
          className="btn btn--danger"
          onClick={() => ocularSession.pause()}
          disabled={starting}
          title={t("camera.pauseTitle")}
        >
          <Pause size={16} aria-hidden />
          <span className="btn__label">{t("camera.pause")}</span>
        </button>
      ) : (
        <button type="button" className="btn btn--primary" onClick={() => void ocularSession.start()}>
          <Play size={16} aria-hidden />
          <span className="btn__label">{status === "paused" ? t("camera.resume") : t("camera.start")}</span>
        </button>
      )}

      {view === "expanded" ? (
        <button type="button" className="btn" onClick={() => setView("minimized")} title={t("camera.minimizeTitle")}>
          <Minimize2 size={16} aria-hidden />
          <span className="btn__label">{t("camera.minimize")}</span>
        </button>
      ) : (
        <button type="button" className="btn" onClick={() => setView("expanded")} title={t("camera.expandTitle")}>
          <Maximize2 size={16} aria-hidden />
          <span className="btn__label">{t("camera.expand")}</span>
        </button>
      )}

      {view === "metrics_only" ? (
        <button type="button" className="btn" onClick={() => setView("minimized")} title={t("camera.showVideoTitle")}>
          <Eye size={16} aria-hidden />
          <span className="btn__label">{t("camera.showVideo")}</span>
        </button>
      ) : (
        <button
          type="button"
          className="btn"
          onClick={() => setView("metrics_only")}
          title={t("camera.hideVideoTitle")}
        >
          <EyeOff size={16} aria-hidden />
          <span className="btn__label">{t("camera.hideVideo")}</span>
        </button>
      )}

      {view === "expanded" && (
        <>
          <button
            type="button"
            className="btn"
            onClick={() => ocularSession.recalibrate()}
            disabled={!active}
            title={t("camera.recalibrateTitle")}
          >
            <RotateCcw size={16} aria-hidden />
            <span className="btn__label">{t("camera.recalibrate")}</span>
          </button>
          <button
            type="button"
            className={cx("btn btn--icon", showOverlay && "btn--on")}
            onClick={toggleOverlay}
            aria-pressed={showOverlay}
            title={showOverlay ? t("camera.hideLandmarks") : t("camera.showLandmarks")}
          >
            <Layers size={16} aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}
