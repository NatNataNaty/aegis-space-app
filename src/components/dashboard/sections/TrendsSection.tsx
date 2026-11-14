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
import { useTranslation } from "react-i18next";

type SeriesKey = "heartRate" | "spo2" | "temperature" | "bloodPressure" | "respRate";

// Etiquetas en i18n (labelKey)
const SERIES: Record<SeriesKey, { labelKey: string; unit: string; decimals: number }> = {
  heartRate: { labelKey: "metrics.heartRate", unit: "bpm", decimals: 0 },
  spo2: { labelKey: "metrics.spo2", unit: "%", decimals: 0 },
  temperature: { labelKey: "metrics.temperature", unit: "°C", decimals: 1 },
  bloodPressure: { labelKey: "metrics.bloodPressure", unit: "mmHg", decimals: 0 },
  respRate: { labelKey: "sections.trends.respRate", unit: "resp/min", decimals: 0 },
};

export function TrendsSection() {
  const { t } = useTranslation();
  const history = useHealthStore((s) => s.snapshot.history24h);
  const trend7d = useHealthStore((s) => s.snapshot.trend7d);
  const [series, setSeries] = useState<SeriesKey>("heartRate");
  const meta = SERIES[series];

  const selector = (
    <div className="seg" role="tablist" aria-label={t("sections.trends.indicator")}>
      {(Object.keys(SERIES) as SeriesKey[]).map((key) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={series === key}
          className={cx("seg__btn", series === key && "seg__btn--on")}
          onClick={() => setSeries(key)}
        >
          {t(SERIES[key].labelKey)}
        </button>
      ))}
    </div>
  );

  const fmt = (v: unknown) => `${fmtNum(Number(v), meta.decimals)} ${meta.unit}`;

  return (
    <div className="section-grid section-grid--wide">
      <ChartCard title={t("sections.trends.last24")} subtitle={t("sections.trends.last24Sub")} origin="simulated" actions={selector} height={260}>
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
                <Area dataKey="systolic" name={t("sections.trends.systolic")} stroke={CHART.primary} fill="url(#fillSim)" strokeWidth={2} isAnimationActive={false} />
                <Area dataKey="diastolic" name={t("sections.trends.diastolic")} stroke={CHART.secondary} fill="transparent" strokeWidth={2} isAnimationActive={false} />
              </>
            ) : (
              <Area dataKey={series} name={t(meta.labelKey)} stroke={CHART.primary} fill="url(#fillSim)" strokeWidth={2} isAnimationActive={false} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={t("sections.trends.last7")} subtitle={t("sections.trends.last7Sub")} origin="simulated" height={260}>
        <ResponsiveContainer>
          <ComposedChart data={trend7d} margin={{ top: 8, right: 4, bottom: 0, left: -8 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis yAxisId="h" unit=" h" width={44} domain={[0, 10]} {...axisProps} />
            <YAxis yAxisId="r" orientation="right" width={40} domain={["dataMin - 5", "dataMax + 5"]} {...axisProps} />
            <Tooltip
              {...tooltipProps}
              formatter={(v, name) => [name === t("sections.trends.sleep") ? `${fmtNum(Number(v), 1)} h` : `${fmtNum(Number(v))} bpm`, name]}
            />
            <Bar yAxisId="h" dataKey="sleepHours" name={t("sections.trends.sleep")} fill={CHART.secondary} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
            <Line yAxisId="r" dataKey="restingHr" name={t("sections.trends.restingHr")} stroke={CHART.primary} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
