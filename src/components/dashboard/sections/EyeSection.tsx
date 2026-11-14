import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { OcularSummary } from "../../../features/camera/camera.types";
import { EYE_CONFIG } from "../../../features/camera/eyeMetrics.config";
import { fmtClock, fmtNum } from "../../../lib/format";
import { useCameraStore } from "../../../stores/camera.store";
import { InfoTip } from "../../common/InfoTip";
import { OriginBadge } from "../../common/OriginBadge";
import { QualityTag } from "../../common/StatusTag";
import { axisProps, CHART, ChartCard, EmptyChart, tooltipProps } from "../../charts/ChartCard";

const KIND_COLOR = {
  blink: CHART.primary,
  prolonged_closure: CHART.warn,
  long_closure: CHART.alert,
} as const;

function SummaryColumn({ title, s, show }: { title: string; s: OcularSummary | null; show: boolean }) {
  const val = (v: number | null | undefined, d = 0) => (show && s ? fmtNum(v ?? null, d) : "—");
  return (
    <div className="summary-col">
      <div className="summary-col__head">
        <span>{title}</span>
        {show && s && <QualityTag quality={s.quality} short />}
      </div>
      <dl>
        <dt>PERCLOS</dt>
        <dd>{show && s?.perclos == null ? "No disponible" : `${val(s?.perclos, 1)} %`}</dd>
        <dt>Parpadeos/min</dt>
        <dd>{val(s?.blinksPerMin)}</dd>
        <dt>Duración media del parpadeo</dt>
        <dd>{s?.meanBlinkDurationMs != null && show ? `${val(s.meanBlinkDurationMs)} ms` : "—"}</dd>
        <dt>Cierres prolongados</dt>
        <dd>{show && s ? s.prolongedClosures : "—"}</dd>
        <dt>Cierres largos</dt>
        <dd>{show && s ? s.longClosures : "—"}</dd>
        <dt>Aperturas prolongadas de boca</dt>
        <dd>{val(s?.possibleYawns)}</dd>
        <dt>Cobertura válida</dt>
        <dd>{show && s ? `${fmtNum(s.validCoverage * 100)} %` : "—"}</dd>
      </dl>
    </div>
  );
}

export function EyeSection() {
  const status = useCameraStore((s) => s.status);
  const calibrated = useCameraStore((s) => s.calibration.phase === "ready");
  const s60 = useCameraStore((s) => s.summary60);
  const s300 = useCameraStore((s) => s.summary300);
  const events = useCameraStore((s) => s.events);
  const trend = useCameraStore((s) => s.trend);
  const offset = useCameraStore((s) => s.clockOffset);
  const pose = useCameraStore((s) => s.frame?.headPose ?? null);

  const show = (status === "active" && calibrated) || (status === "paused" && s60 !== null);
  const eventPoints = events.map((e) => ({
    t: e.endedAt + offset,
    duration: Math.round(e.durationMs),
    kind: e.kind,
  }));

  return (
    <div className="section-grid">
      <article className="panel">
        <header className="panel__head">
          <div>
            <h3>
              Métricas oculares <InfoTip metric="closures" />
            </h3>
            <p className="panel__sub">Calculadas en este dispositivo a partir de la cámara.</p>
          </div>
          <OriginBadge origin="camera_live" stale={status === "paused" && s60 !== null} />
        </header>
        <div className="summary-cols">
          <SummaryColumn title="Ventana 1 min" s={s60} show={show} />
          <SummaryColumn title="Ventana 5 min" s={s300} show={show} />
        </div>
        {status === "active" && pose && (
          <p className="panel__note">
            Orientación de cabeza (contextual): inclinación {fmtNum(pose.pitch)}°, giro {fmtNum(pose.yaw)}°, ladeo{" "}
            {fmtNum(pose.roll)}°
          </p>
        )}
      </article>

      <ChartCard
        title="Línea de tiempo de cierres"
        subtitle={`Duración de cada evento · cortes ${EYE_CONFIG.blinkMaxMs} y ${EYE_CONFIG.prolongedMaxMs} ms`}
        origin="camera_live"
      >
        {eventPoints.length === 0 ? (
          <EmptyChart text="Sin eventos registrados en esta sesión" />
        ) : (
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis
                dataKey="t"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(v: number) => fmtClock(v, false)}
                {...axisProps}
              />
              <YAxis dataKey="duration" type="number" unit=" ms" width={64} {...axisProps} />
              <ZAxis range={[36, 36]} />
              <ReferenceLine y={EYE_CONFIG.blinkMaxMs} stroke={CHART.warn} strokeDasharray="4 4" />
              <ReferenceLine y={EYE_CONFIG.prolongedMaxMs} stroke={CHART.alert} strokeDasharray="4 4" />
              <Tooltip
                {...tooltipProps}
                labelFormatter={() => ""}
                formatter={(value, name) =>
                  name === "t" ? [fmtClock(Number(value)), "Hora"] : [`${value} ms`, "Duración"]
                }
              />
              {(["blink", "prolonged_closure", "long_closure"] as const).map((kind) => (
                <Scatter
                  key={kind}
                  data={eventPoints.filter((p) => p.kind === kind)}
                  fill={KIND_COLOR[kind]}
                  isAnimationActive={false}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="PERCLOS y parpadeos en la sesión" subtitle="Muestreo cada 10 s · ventana 1 min" origin="camera_live">
        {trend.length < 2 ? (
          <EmptyChart text="Se necesitan al menos 20 s de datos calibrados" />
        ) : (
          <ResponsiveContainer>
            <LineChart data={trend} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="t" tickFormatter={(v: number) => fmtClock(v, false)} {...axisProps} />
              <YAxis yAxisId="p" unit="%" width={48} {...axisProps} />
              <YAxis yAxisId="b" orientation="right" width={36} {...axisProps} />
              <Tooltip
                {...tooltipProps}
                labelFormatter={(v) => fmtClock(Number(v))}
                formatter={(value, name) =>
                  value == null
                    ? ["No disponible", name]
                    : name === "PERCLOS"
                      ? [`${fmtNum(Number(value), 1)} %`, name]
                      : [fmtNum(Number(value)), name]
                }
              />
              <Line
                yAxisId="p"
                dataKey="perclos"
                name="PERCLOS"
                stroke={CHART.live}
                dot={false}
                strokeWidth={2}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="b"
                dataKey="blinksPerMin"
                name="Parpadeos/min"
                stroke={CHART.primary}
                dot={false}
                strokeWidth={1.5}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
