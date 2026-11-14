import type { ReactNode } from "react";
import type { MetricId } from "../../data/metricCatalog";
import type { DataOrigin } from "../../features/camera/camera.types";
import { cx } from "../../lib/format";
import { InfoTip } from "../common/InfoTip";
import { OriginBadge } from "../common/OriginBadge";

interface MetricCardProps {
  label: string;
  icon: ReactNode;
  value: string;
  unit?: string;
  origin: DataOrigin;
  stale?: boolean;
  status?: ReactNode;
  footer?: ReactNode;
  info?: MetricId;
  unavailable?: boolean;
}

export function MetricCard({
  label,
  icon,
  value,
  unit,
  origin,
  stale,
  status,
  footer,
  info,
  unavailable,
}: MetricCardProps) {
  return (
    <article className={cx("metric", unavailable && "metric--na")}>
      <header className="metric__head">
        <span className="metric__icon" aria-hidden>
          {icon}
        </span>
        <span className="metric__label">{label}</span>
        {info && <InfoTip metric={info} />}
      </header>
      <div className="metric__value">
        <span className="metric__num">{value}</span>
        {unit && !unavailable && <span className="metric__unit">{unit}</span>}
      </div>
      <footer className="metric__foot">
        <OriginBadge origin={origin} stale={stale} />
        {status}
      </footer>
      {footer && <div className="metric__extra">{footer}</div>}
    </article>
  );
}
