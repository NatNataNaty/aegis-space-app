import { Eye } from "lucide-react";
import type { OcularSummary } from "../../features/camera/camera.types";
import { cx, fmtClock, fmtNum } from "../../lib/format";
import { useCameraStore } from "../../stores/camera.store";
import { InfoTip } from "../common/InfoTip";
import { OriginBadge } from "../common/OriginBadge";
import { QualityTag } from "../common/StatusTag";
import { useTranslation } from "react-i18next";

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <span className="stat__value">
        {value}
        {unit && value !== "—" && <small>{unit}</small>}
      </span>
    </div>
  );
}

/** "Vigilancia ocular": compact live summary shown when the camera is minimized or hidden. */
export function OcularCard() {
  const { t } = useTranslation();
  const status = useCameraStore((s) => s.status);
  const s60 = useCameraStore((s) => s.summary60);
  const s300 = useCameraStore((s) => s.summary300);
  const frame = useCameraStore((s) => s.frame);
  const calibrated = useCameraStore((s) => s.calibration.phase === "ready");
  const lastReadingAt = useCameraStore((s) => s.lastReadingAt);

  const active = status === "active";
  const stale = status === "paused" && s60 !== null;
  const show = (active && calibrated) || stale;
  const v = (sum: OcularSummary | null, pick: (s: OcularSummary) => number | null, d = 0) =>
    show && sum ? fmtNum(pick(sum), d) : "—";

  return (
    <article className={cx("ocular-card", stale && "ocular-card--stale")}>
      <header className="ocular-card__head">
        <Eye size={16} aria-hidden />
        <h3>{t("ocular.title")}</h3>
        <InfoTip metric="perclos" />
        <span className="spacer" />
        <OriginBadge origin="camera_live" stale={stale} />
      </header>

      <div className="ocular-card__state">
        <span className={`eye__state eye__state--${active && frame ? frame.eyeState : "unknown"}`}>
          <span className="eye__dot" aria-hidden />
          {t("ocular.eyes", { state: t(`eyeState.${active && frame ? frame.eyeState : "unknown"}`) })}
        </span>
        {active && frame && <QualityTag quality={frame.quality} />}
        {stale && <span className="muted">{t("common.lastReading", { time: fmtClock(lastReadingAt) })}</span>}
        {active && !calibrated && <span className="muted">{t("common.calibrating")}</span>}
        {!active && !stale && <span className="muted">{t("ocular.inactive")}</span>}
      </div>

      <div className="ocular-card__stats">
        <Stat label={t("ocular.perclos1")} value={v(s60, (s) => s.perclos, 1)} unit="%" />
        <Stat label={t("ocular.perclos5")} value={v(s300, (s) => s.perclos, 1)} unit="%" />
        <Stat label={t("ocular.blinksMin")} value={v(s60, (s) => s.blinksPerMin)} />
        <Stat label={t("ocular.longClosures5")} value={show && s300 ? String(s300.longClosures) : "—"} />
      </div>
    </article>
  );
}
