import { Eye, Gauge, HeartPulse, Moon, Thermometer, Wind } from "lucide-react";
import { fmtNum } from "../../lib/format";
import { useCameraStore } from "../../stores/camera.store";
import { useHealthStore } from "../../stores/health.store";
import { QualityTag, SimStatusTag } from "../common/StatusTag";
import { MetricCard } from "../metrics/MetricCard";

function PerclosCard() {
  const status = useCameraStore((s) => s.status);
  const summary = useCameraStore((s) => s.summary60);
  const calibrated = useCameraStore((s) => s.calibration.phase === "ready");
  const stale = status === "paused" && summary !== null && summary.perclos !== null;
  const live = status === "active" && calibrated;
  const value = (live || stale) && summary ? summary.perclos : null;

  let footer = "Inicia la cámara para medir";
  if (status === "active" && !calibrated) footer = "Calibrando…";
  else if (live && value === null) footer = "Cobertura insuficiente";
  else if (value !== null) footer = "Ventana 1 min";

  return (
    <MetricCard
      label="PERCLOS"
      icon={<Eye size={16} />}
      value={value === null ? "No disponible" : fmtNum(value, 1)}
      unit="%"
      unavailable={value === null}
      origin="camera_live"
      stale={stale}
      info="perclos"
      status={live && summary ? <QualityTag quality={summary.quality} short /> : undefined}
      footer={<span className="metric__hint">{footer}</span>}
    />
  );
}

export function PriorityMetrics() {
  const snapshot = useHealthStore((s) => s.snapshot);
  const { heartRate, spo2, bloodPressure, temperature } = snapshot.vitals;

  return (
    <div className="metrics-grid">
      <MetricCard
        label="Frecuencia cardíaca"
        icon={<HeartPulse size={16} />}
        value={fmtNum(heartRate.value)}
        unit="bpm"
        origin="simulated"
        info="heartRate"
        status={<SimStatusTag status={heartRate.status} />}
      />
      <MetricCard
        label="SpO₂"
        icon={<Wind size={16} />}
        value={fmtNum(spo2.value)}
        unit="%"
        origin="simulated"
        info="spo2"
        status={<SimStatusTag status={spo2.status} />}
      />
      <MetricCard
        label="Presión arterial"
        icon={<Gauge size={16} />}
        value={`${fmtNum(bloodPressure.value)}/${fmtNum(bloodPressure.value2)}`}
        unit="mmHg"
        origin="simulated"
        info="bloodPressure"
        status={<SimStatusTag status={bloodPressure.status} />}
      />
      <MetricCard
        label="Temperatura"
        icon={<Thermometer size={16} />}
        value={fmtNum(temperature.value, 1)}
        unit="°C"
        origin="simulated"
        info="temperature"
        status={<SimStatusTag status={temperature.status} />}
      />
      <MetricCard
        label="Sueño último ciclo"
        icon={<Moon size={16} />}
        value={fmtNum(snapshot.sleep.lastNightHours, 1)}
        unit="h"
        origin="simulated"
        info="sleep"
        status={
          <SimStatusTag
            status={snapshot.sleep.lastNightHours < 5 ? "variation" : snapshot.sleep.lastNightHours < 6 ? "watch" : "stable"}
          />
        }
      />
      <PerclosCard />
    </div>
  );
}
