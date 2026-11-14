import type { ReactNode } from "react";
import type { DataOrigin } from "../../features/camera/camera.types";
import { OriginBadge } from "../common/OriginBadge";

export const CHART = {
  grid: "rgba(148, 163, 184, 0.12)",
  axis: "#7c879b",
  tooltipBg: "#0f1522",
  tooltipBorder: "#263044",
  primary: "#5cc8ff",
  secondary: "#a78bfa",
  live: "#3ddc97",
  warn: "#f5b84c",
  alert: "#ff7a59",
} as const;

export const axisProps = {
  stroke: CHART.axis,
  tick: { fill: CHART.axis, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: CHART.grid },
} as const;

export const tooltipProps = {
  contentStyle: {
    background: CHART.tooltipBg,
    border: `1px solid ${CHART.tooltipBorder}`,
    borderRadius: 8,
    fontSize: 12,
    color: "#e6ebf2",
  },
  labelStyle: { color: "#9aa5b8" },
  cursor: { stroke: "rgba(148,163,184,0.3)" },
} as const;

interface ChartCardProps {
  title: string;
  origin: DataOrigin;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  height?: number;
}

export function ChartCard({ title, origin, subtitle, actions, children, height = 220 }: ChartCardProps) {
  return (
    <article className="panel chart-card">
      <header className="panel__head">
        <div>
          <h3>{title}</h3>
          {subtitle && <p className="panel__sub">{subtitle}</p>}
        </div>
        <div className="panel__actions">
          {actions}
          <OriginBadge origin={origin} />
        </div>
      </header>
      <div className="chart-card__body" style={{ height }}>
        {children}
      </div>
    </article>
  );
}

export function EmptyChart({ text }: { text: string }) {
  return <div className="chart-empty">{text}</div>;
}
