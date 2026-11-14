import { ocularSession } from "../../features/camera/ocularSession";
import { EYE_CONFIG } from "../../features/camera/eyeMetrics.config";
import { useCameraStore } from "../../stores/camera.store";
import { useTranslation } from "react-i18next";

export function CalibrationGuide() {
  const { t } = useTranslation();
  const calibration = useCameraStore((s) => s.calibration);
  const faceVisible = useCameraStore((s) => s.frame?.faceVisible ?? false);
  const view = useCameraStore((s) => s.view);

  if (calibration.phase === "ready" || calibration.phase === "idle") return null;
  const step = calibration.phase === "collecting_open" ? 1 : 2;

  return (
    <div className={`calib ${view !== "expanded" ? "calib--compact" : ""}`} role="status" aria-live="polite">
      {view === "expanded" && <div className="calib__frame" aria-hidden />}
      <div className="calib__card">
        <span className="calib__step">{t("camera.calibStep", { step })}</span>
        <p className="calib__msg">
          {!faceVisible && step === 1 ? t("camera.faceToCamera") : calibration.message}
        </p>
        {step === 2 && (
          <div className="calib__blinks" aria-label={t("camera.blinksDetected", { count: calibration.blinksDetected })}>
            {Array.from({ length: EYE_CONFIG.calibrationBlinkTarget }, (_, i) => (
              <span key={i} className={i < calibration.blinksDetected ? "on" : ""} />
            ))}
          </div>
        )}
        <div className="progress" aria-hidden>
          <span style={{ width: `${Math.round(calibration.progress * 100)}%` }} />
        </div>
        {step === 2 && view === "expanded" && (
          <button type="button" className="link-btn" onClick={() => ocularSession.skipBlinkCheck()}>
            {t("camera.skipCheck")}
          </button>
        )}
      </div>
    </div>
  );
}
