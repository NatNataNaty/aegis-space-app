import { CameraOff, LoaderCircle, ScanFace, ShieldCheck } from "lucide-react";
import { ocularSession } from "../../features/camera/ocularSession";
import { fmtClock } from "../../lib/format";
import { useCameraStore } from "../../stores/camera.store";
import { useTranslation } from "react-i18next";

export function CameraIdle() {
  const { t } = useTranslation();
  const status = useCameraStore((s) => s.status);
  const error = useCameraStore((s) => s.error);
  const modelState = useCameraStore((s) => s.modelState);
  const lastReadingAt = useCameraStore((s) => s.lastReadingAt);

  if (status === "starting") {
    return (
      <div className="stage-msg">
        <LoaderCircle size={28} className="spin" aria-hidden />
        <p>{modelState === "loading" ? t("camera.loadingModel") : t("camera.requesting")}</p>
      </div>
    );
  }

  if (status === "error" && error) {
    return (
      <div className="stage-msg stage-msg--error" role="alert">
        <CameraOff size={28} aria-hidden />
        <p>{error.message}</p>
        <button type="button" className="btn btn--primary" onClick={() => void ocularSession.start()}>
          {t("camera.retry")}
        </button>
      </div>
    );
  }

  if (status === "paused") {
    return (
      <div className="stage-msg">
        <CameraOff size={28} aria-hidden />
        <p>{t("camera.paused")}</p>
        {lastReadingAt && <span className="stage-msg__sub">{t("common.lastReading", { time: fmtClock(lastReadingAt) })}</span>}
      </div>
    );
  }

  return (
    <div className="stage-msg">
      <ScanFace size={32} aria-hidden />
      <p>{t("camera.idle")}</p>
      <span className="stage-msg__sub">
        <ShieldCheck size={13} aria-hidden /> {t("camera.privacy")}
      </span>
    </div>
  );
}
