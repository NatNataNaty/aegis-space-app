import { Dumbbell, Radiation } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtNum } from "../../../lib/format";
import { useHealthStore } from "../../../stores/health.store";
import { InfoTip } from "../../common/InfoTip";
import { OriginBadge } from "../../common/OriginBadge";
import { axisProps, CHART, ChartCard, tooltipProps } from "../../charts/ChartCard";

const WORKLOAD_LABEL = { habitual: "Habitual", elevada: "Elevada", exigente: "Exigente" } as const;

export function ExposureSection() {
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
              <Radiation size={16} aria-hidden /> Radiación acumulada <InfoTip metric="radiation" />
            </h3>
            <p className="panel__sub">Valor demostrativo para un tránsito interplanetario.</p>
          </div>
          <OriginBadge origin="simulated" />
        </header>
        <div className="big-figure">
          {fmtNum(exposure.totalMsv, 1)}
          <small>mSv</small>
        </div>
        <p className="muted">Tasa diaria de la demo: {fmtNum(exposure.dailyMsv, 1)} mSv/día</p>
      </article>

      <article className="panel">
        <header className="panel__head">
          <div>
            <h3>
              <Dumbbell size={16} aria-hidden /> Actividad física <InfoTip metric="exercise" />
            </h3>
            <p className="panel__sub">Ejercicio completado hoy según el horario.</p>
          </div>
          <OriginBadge origin="simulated" />
        </header>
        <div className="big-figure">
          {activity.exerciseTodayMin}
          <small>/ {activity.exerciseTargetMin} min</small>
        </div>
        <div className="progress progress--lg" aria-label={`${pct} % del objetivo`}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="muted">Carga de trabajo: {WORKLOAD_LABEL[activity.workloadLabel]}</p>
      </article>

      <ChartCard title="Ejercicio y carga de trabajo · 7 días" origin="simulated">
        <ResponsiveContainer>
          <BarChart data={trend7d} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis yAxisId="e" width={44} {...axisProps} />
            <YAxis yAxisId="w" orientation="right" width={32} {...axisProps} />
            <Tooltip
              {...tooltipProps}
              formatter={(v, name) => [name === "Ejercicio" ? `${v} min` : `${fmtNum(Number(v), 1)} h`, name]}
            />
            <Bar yAxisId="e" dataKey="exerciseMin" name="Ejercicio" fill={CHART.live} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
            <Bar yAxisId="w" dataKey="workloadHours" name="Trabajo" fill={CHART.secondary} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
