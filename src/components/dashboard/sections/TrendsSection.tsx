import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cx, fmtNum } from "../../../lib/format";
import { useHealthStore } from "../../../stores/health.store";
import { axisProps, CHART, ChartCard, tooltipProps } from "../../charts/ChartCard";

type SeriesKey = "heartRate" | "spo2" | "temperature" | "bloodPressure" | "respRate";

const SERIES: Record<SeriesKey, { label: string; unit: string; decimals: number }> = {
  heartRate: { label: "Frecuencia cardíaca", unit: "bpm", decimals: 0 },
  spo2: { label: "SpO₂", unit: "%", decimals: 0 },
  temperature: { label: "Temperatura", unit: "°C", decimals: 1 },
  bloodPressure: { label: "Presión arterial", unit: "mmHg", decimals: 0 },
  respRate: { label: "Resp./min", unit: "resp/min", decimals: 0 },
};

export function TrendsSection() {
  const history = useHealthStore((s) => s.snapshot.history24h);
  const trend7d = useHealthStore((s) => s.snapshot.trend7d);
  const [series, setSeries] = useState<SeriesKey>("heartRate");
  const meta = SERIES[series];

  const selector = (
    <div className="seg" role="tablist" aria-label="Indicador">
      {(Object.keys(SERIES) as SeriesKey[]).map((key) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={series === key}
          className={cx("seg__btn", series === key && "seg__btn--on")}
          onClick={() => setSeries(key)}
        >
          {SERIES[key].label}
        </button>
      ))}
    </div>
  );

  const fmt = (v: unknown) => `${fmtNum(Number(v), meta.decimals)} ${meta.unit}`;

  return (
    <div className="section-grid section-grid--wide">
      <ChartCard title="Últimas 24 horas" subtitle="Muestras cada 30 min del escenario" origin="simulated" actions={selector} height={260}>
        <ResponsiveContainer>
          <AreaChart data={history} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="fillSim" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART.primary} stopOpacity={0.28} />
                <stop offset="100%" stopColor={CHART.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="label" interval={5} {...axisProps} />
            <YAxis domain={["auto", "auto"]} width={48} {...axisProps} />
            <Tooltip {...tooltipProps} formatter={(v, name) => [fmt(v), name]} />
            {series === "bloodPressure" ? (
              <>
                <Area dataKey="systolic" name="Sistólica" stroke={CHART.primary} fill="url(#fillSim)" strokeWidth={2} isAnimationActive={false} />
                <Area dataKey="diastolic" name="Diastólica" stroke={CHART.secondary} fill="transparent" strokeWidth={2} isAnimationActive={false} />
              </>
            ) : (
              <Area dataKey={series} name={meta.label} stroke={CHART.primary} fill="url(#fillSim)" strokeWidth={2} isAnimationActive={false} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Últimos 7 días" subtitle="Sueño (barras) y frecuencia cardíaca en reposo (línea)" origin="simulated" height={260}>
        <ResponsiveContainer>
          <ComposedChart data={trend7d} margin={{ top: 8, right: 4, bottom: 0, left: -8 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis yAxisId="h" unit=" h" width={44} domain={[0, 10]} {...axisProps} />
            <YAxis yAxisId="r" orientation="right" width={40} domain={["dataMin - 5", "dataMax + 5"]} {...axisProps} />
            <Tooltip
              {...tooltipProps}
              formatter={(v, name) => [name === "Sueño" ? `${fmtNum(Number(v), 1)} h` : `${fmtNum(Number(v))} bpm`, name]}
            />
            <Bar yAxisId="h" dataKey="sleepHours" name="Sueño" fill={CHART.secondary} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
            <Line yAxisId="r" dataKey="restingHr" name="FC en reposo" stroke={CHART.primary} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
