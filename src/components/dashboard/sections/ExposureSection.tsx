import { Dumbbell, Radiation } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtNum } from "../../../lib/format";
import { useHealthStore } from "../../../stores/health.store";
import { InfoTip } from "../../common/InfoTip";
import { OriginBadge } from "../../common/OriginBadge";
import { axisProps, CHART, ChartCard, tooltipProps } from "../../charts/ChartCard";
import { useTranslation } from "react-i18next";

export function ExposureSection() {
  const { t } = useTranslation();
  const exposure = useHealthStore((s) => s.snapshot.exposure);
  const activity = useHealthStore((s) => s.snapshot.activity);
  const trend7d = useHealthStore((s) => s.snapshot.trend7d);
  const pct = Math.min(100, Math.round((activity.exerciseTodayMin / activity.exerciseTargetMin) * 100));

  return (
    <div className="section-grid">
      <article className="panel">
        <header className="panel__head">
          <div>
            <h3>
              <Radiation size={16} aria-hidden /> {t("sections.exposure.radiation")} <InfoTip metric="radiation" />
            </h3>
            <p className="panel__sub">{t("sections.exposure.radiationSub")}</p>
          </div>
          <OriginBadge origin="simulated" />
        </header>
        <div className="big-figure">
          {fmtNum(exposure.totalMsv, 1)}
          <small>mSv</small>
        </div>
        <p className="muted">{t("sections.exposure.dailyRate", { value: fmtNum(exposure.dailyMsv, 1) })}</p>
      </article>

      <article className="panel">
        <header className="panel__head">
          <div>
            <h3>
              <Dumbbell size={16} aria-hidden /> {t("sections.exposure.activity")} <InfoTip metric="exercise" />
            </h3>
            <p className="panel__sub">{t("sections.exposure.activitySub")}</p>
          </div>
          <OriginBadge origin="simulated" />
        </header>
        <div className="big-figure">
          {activity.exerciseTodayMin}
          <small>/ {activity.exerciseTargetMin} min</small>
        </div>
        <div
          className="progress progress--lg"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={t("sections.exposure.pctGoal", { pct })}
        >
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="muted">{t("sections.exposure.workload", { label: t(`sections.exposure.workloadLabel.${activity.workloadLabel}`) })}</p>
      </article>

      <ChartCard title={t("sections.exposure.chartTitle")} origin="simulated">
        <ResponsiveContainer>
          <BarChart data={trend7d} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis yAxisId="e" width={44} {...axisProps} />
            <YAxis yAxisId="w" orientation="right" width={32} {...axisProps} />
            <Tooltip
              {...tooltipProps}
              formatter={(v, name) => [name === t("sections.exposure.exercise") ? `${v} min` : `${fmtNum(Number(v), 1)} h`, name]}
            />
            <Bar yAxisId="e" dataKey="exerciseMin" name={t("sections.exposure.exercise")} fill={CHART.live} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
            <Bar yAxisId="w" dataKey="workloadHours" name={t("sections.exposure.work")} fill={CHART.secondary} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
