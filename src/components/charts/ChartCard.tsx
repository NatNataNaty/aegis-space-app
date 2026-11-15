import type { ReactNode } from "react";
import type { DataOrigin } from "../../features/camera/camera.types";
import { OriginBadge } from "../common/OriginBadge";

export const CHART = {
  // Paleta «Atardecer marciano» (mismos valores que las variables de src/styles/mars.css).
  grid: "rgba(227, 205, 189, 0.12)",
  axis: "#d2bbac",
  tooltipBg: "#1a0f14",
  tooltipBorder: "#5c3d49",
  primary: "#9fd0f2",
  secondary: "#c9b6f2",
  live: "#8fd6b4",
  warn: "#f2b35b",
  alert: "#ffa088",
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
    color: "#f7e9dd",
  },
  labelStyle: { color: "#d2bbac" },
  cursor: { stroke: "rgba(227, 205, 189, 0.3)" },
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
