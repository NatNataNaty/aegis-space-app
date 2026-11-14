import { ScanFace } from "lucide-react";
import { useCameraStore } from "../../stores/camera.store";
import { QualityTag } from "../common/StatusTag";
import { useTranslation } from "react-i18next";

export function StageChips() {
  const { t } = useTranslation();
  const frame = useCameraStore((s) => s.frame);
  if (!frame) return null;

  return (
    <div className="chips">
      <span className={`chip ${frame.faceVisible ? "chip--ok" : "chip--muted"}`}>
        <ScanFace size={12} aria-hidden />
        {frame.faceVisible ? t("camera.faceDetected") : t("camera.noFace")}
      </span>
      <QualityTag quality={frame.quality} short />
      <span className="chip chip--mono">{frame.fps} FPS</span>
    </div>
  );
}
