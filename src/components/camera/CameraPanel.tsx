import { simT } from "../../i18n";
import { useEffect, useRef } from "react";
import { CAMERA_ERROR_TEXT } from "../../features/camera/camera.service";
import { ocularSession } from "../../features/camera/ocularSession";
import { cx } from "../../lib/format";
import { useCameraStore } from "../../stores/camera.store";
import { OriginBadge } from "../common/OriginBadge";
import { CalibrationGuide } from "./CalibrationGuide";
import { CameraControls } from "./CameraControls";
import { CameraIdle } from "./CameraIdle";
import { EyeReadout } from "./EyeReadout";
import { LiveIndicator } from "./LiveIndicator";
import { StageChips } from "./StageChips";
import { useTranslation } from "react-i18next";

/**
 * Rendered once at a fixed position in the tree. Changing the view only changes CSS classes,
 * so the <video>, the MediaStream and the Face Landmarker instance are never recreated.
 */
export function CameraPanel() {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const view = useCameraStore((s) => s.view);
  const status = useCameraStore((s) => s.status);
  const error = useCameraStore((s) => s.error);
  const showOverlay = useCameraStore((s) => s.showOverlay);
  const calibrationPhase = useCameraStore((s) => s.calibration.phase);
  const delegate = useCameraStore((s) => s.delegate);
  const fps = useCameraStore((s) => s.frame?.fps ?? null);

  useEffect(() => {
    ocularSession.bindElements(videoRef.current, canvasRef.current);
    return () => ocularSession.bindElements(null, null);
  }, []);

  useEffect(() => {
    ocularSession.redrawOverlayVisibility();
  }, [showOverlay, view]);

  const active = status === "active";

  return (
    <section className={cx("camera", `camera--${view}`, `camera--${status}`)} aria-label={t("camera.title")}>
      <header className="camera__head">
        <div className="camera__title">
          <h2>{t("camera.title")}</h2>
          {active && <OriginBadge origin="camera_live" />}
        </div>
        <LiveIndicator />
      </header>

      <div className="camera__stage">
        <video ref={videoRef} className="camera__video" autoPlay muted playsInline aria-hidden />
        <canvas ref={canvasRef} className="camera__overlay" aria-hidden />
        {active && <StageChips />}
        {active && calibrationPhase !== "ready" && <CalibrationGuide />}
        {!active && <CameraIdle />}
      </div>

      <div className="camera__metrics-only">
        <LiveIndicator long />
      </div>

      <CameraControls />

      {view === "expanded" && <EyeReadout />}

      {view === "expanded" && (
        <footer className="camera__foot">
          <span>{t("camera.localProcessing")}</span>
          <span>
            {delegate ? t("camera.delegate", { delegate }) : t("camera.noModel")}
            {active && fps !== null && ` · ${fps} FPS`}
          </span>
        </footer>
      )}

      {status === "error" && error && view !== "expanded" && (
        <p className="camera__error" role="alert">
          {simT(error.message || CAMERA_ERROR_TEXT[error.code])}
        </p>
      )}
    </section>
  );
}
