import { useEffect, useState } from "react";
import type { EyeState } from "../../features/camera/camera.types";
import { cx, fmtNum } from "../../lib/format";
import { useCameraStore } from "../../stores/camera.store";
import { InfoTip } from "../common/InfoTip";

export const EYE_STATE_LABEL: Record<EyeState, string> = {
  open: "Abiertos",
  closing: "Cerrándose",
  closed: "Cerrados",
  unknown: "No disponible",
};

const KIND_LABEL = {
  blink: "Parpadeo",
  prolonged_closure: "Cierre prolongado",
  long_closure: "Cierre largo",
} as const;

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
        <span className="eye__label">Ojos</span>
        <span className={`eye__state eye__state--${state}`}>
          <span className="eye__dot" aria-hidden />
          {EYE_STATE_LABEL[state]}
        </span>
      </div>
      <div className="eye__item">
        <span className="eye__label">
          Apertura <InfoTip metric="ear" align="left" />
        </span>
        <span className="eye__value">
          {active && frame?.normalizedEar != null ? `${fmtNum(frame.normalizedEar * 100)} %` : "—"}
        </span>
      </div>
      <div className="eye__item">
        <span className="eye__label">
          {closingFor !== null ? "Cierre en curso" : "Último cierre"} <InfoTip metric="closures" align="left" />
        </span>
        <span className="eye__value">
          {closingFor !== null
            ? `${fmtNum(closingFor)} ms`
            : lastEvent
              ? `${fmtNum(lastEvent.durationMs)} ms`
              : "—"}
        </span>
        {closingFor === null && lastEvent && <span className="eye__sub">{KIND_LABEL[lastEvent.kind]}</span>}
      </div>
      <div className="eye__item">
        <span className="eye__label">Eventos (5 min)</span>
        <span className="eye__value">{calibrated ? recent : "—"}</span>
      </div>
      {active && frame && frame.qualityReasons.length > 0 && (
        <p className="eye__reasons">{frame.qualityReasons.join(" · ")}</p>
      )}
    </div>
  );
}
