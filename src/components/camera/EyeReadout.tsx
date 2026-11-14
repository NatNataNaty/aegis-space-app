import { useEffect, useState } from "react";
import type { EyeState } from "../../features/camera/camera.types";
import { cx, fmtNum } from "../../lib/format";
import { useCameraStore } from "../../stores/camera.store";
import { InfoTip } from "../common/InfoTip";
import { useTranslation } from "react-i18next";

// Etiquetas en i18n: eyeState.<estado> y closureKind.<tipo>

function useClosureTimer(closedSince: number | null): number | null {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (closedSince === null) return;
    const id = window.setInterval(() => setNow(performance.now()), 100);
    return () => window.clearInterval(id);
  }, [closedSince]);
  return closedSince === null ? null : Math.max(0, now - closedSince);
}

export function EyeReadout() {
  const { t } = useTranslation();
  const frame = useCameraStore((s) => s.frame);
  const status = useCameraStore((s) => s.status);
  const lastEvent = useCameraStore((s) => s.lastEvent);
  const closedSince = useCameraStore((s) => s.closedSince);
  const calibrated = useCameraStore((s) => s.calibration.phase === "ready");
  const events = useCameraStore((s) => s.events);
  const recent = events.filter((e) => e.endedAt > performance.now() - 300_000).length;
  const closingFor = useClosureTimer(closedSince);

  const active = status === "active";
  const state: EyeState = active && frame ? frame.eyeState : "unknown";
  const stale = status === "paused" && frame !== null;

  return (
    <div className={cx("eye", stale && "eye--stale")}>
      <div className="eye__item">
        <span className="eye__label">{t("camera.eyes")}</span>
        <span className={`eye__state eye__state--${state}`}>
          <span className="eye__dot" aria-hidden />
          {t(`eyeState.${state}`)}
        </span>
      </div>
      <div className="eye__item">
        <span className="eye__label">
          {t("camera.opening")} <InfoTip metric="ear" align="left" />
        </span>
        <span className="eye__value">
          {active && frame?.normalizedEar != null ? `${fmtNum(frame.normalizedEar * 100)} %` : "—"}
        </span>
      </div>
      <div className="eye__item">
        <span className="eye__label">
          {closingFor !== null ? t("camera.closingNow") : t("camera.lastClosure")} <InfoTip metric="closures" align="left" />
        </span>
        <span className="eye__value">
          {closingFor !== null
            ? `${fmtNum(closingFor)} ms`
            : lastEvent
              ? `${fmtNum(lastEvent.durationMs)} ms`
              : "—"}
        </span>
        {closingFor === null && lastEvent && <span className="eye__sub">{t(`closureKind.${lastEvent.kind}`)}</span>}
      </div>
      <div className="eye__item">
        <span className="eye__label">{t("camera.events5")}</span>
        <span className="eye__value">{calibrated ? recent : "—"}</span>
      </div>
      {active && frame && frame.qualityReasons.length > 0 && (
        <p className="eye__reasons">{frame.qualityReasons.join(" · ")}</p>
      )}
    </div>
  );
}
