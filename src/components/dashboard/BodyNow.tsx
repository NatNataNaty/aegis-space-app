import { Check, Droplet, Gauge, Moon, Thermometer, TriangleAlert, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { confidence, useBaselineStore, type BaselineSignal } from "../../features/baseline/personalBaseline";
import type { SimStatus } from "../../features/simulation/simulation.types";
import { fmtNum } from "../../lib/format";
import { useHealthStore } from "../../stores/health.store";
import { useAnimatedNumber } from "../common/useAnimatedNumber";

interface CardSpec {
  id: "spo2" | "pressure" | "temperature" | "sleep";
  Icon: LucideIcon;
  value: string;
  unit: string;
  status: SimStatus;
  baseline?: BaselineSignal;
}

function Value({ value, decimals }: { value: number; decimals: number }) {
  const shown = useAnimatedNumber(value, 800);
  return <>{shown === null ? "—" : fmtNum(shown, decimals)}</>;
}

/** «Tu cuerpo ahora»: cada dato dice qué mide, en palabras sencillas, y si está estable. */
export function BodyNow() {
  const { t } = useTranslation();
  const vitals = useHealthStore((s) => s.snapshot.vitals);
  const sleepHours = useHealthStore((s) => s.snapshot.sleep.lastNightHours);
  const stats = useBaselineStore((s) => s.stats);

  const sleepStatus: SimStatus = sleepHours < 5 ? "variation" : sleepHours < 6 ? "watch" : "stable";
  const cards: (CardSpec & { node: React.ReactNode })[] = [
    { id: "spo2", Icon: Droplet, value: "", unit: "%", status: vitals.spo2.status, baseline: "spo2", node: <Value value={vitals.spo2.value} decimals={0} /> },
    {
      id: "pressure",
      Icon: Gauge,
      value: "",
      unit: "mmHg",
      status: vitals.bloodPressure.status,
      node: (
        <>
          <Value value={vitals.bloodPressure.value} decimals={0} />/<Value value={vitals.bloodPressure.value2 ?? 0} decimals={0} />
        </>
      ),
    },
    { id: "temperature", Icon: Thermometer, value: "", unit: "°C", status: vitals.temperature.status, baseline: "temperature", node: <Value value={vitals.temperature.value} decimals={1} /> },
    { id: "sleep", Icon: Moon, value: "", unit: "h", status: sleepStatus, baseline: "sleepHours", node: <Value value={sleepHours} decimals={1} /> },
  ];

  return (
    <>
      <div className="section-title">
        <h2>{t("body.title")}</h2>
        <span>{t("body.sub")}</span>
      </div>
      <section className="body-now" aria-label={t("body.title")}>
        {cards.map(({ id, Icon, unit, status, baseline, node }) => {
          const st = baseline ? stats[baseline] : null;
          const learned = st && confidence(st) !== "none";
          return (
            <article key={id} className="card body-card">
              <h3 className="body-card__name">
                <Icon size={20} strokeWidth={1.8} aria-hidden />
                {t(`body.${id}.name`)}
              </h3>
              <small>{t(`body.${id}.what`)}</small>
              <span className="body-card__value">
                {node}
                <em>{unit}</em>
              </span>
              <p>{t(`body.${id}.explain`)}</p>
              {learned && (
                <p className="body-card__learn">
                  {t("body.usual", { value: fmtNum(st.mean, id === "spo2" ? 0 : 1), unit })}
                </p>
              )}
              <span className={`body-card__status body-card__status--${status}`}>
                {status === "stable" ? <Check size={16} aria-hidden /> : <TriangleAlert size={16} aria-hidden />}
                {t(`simStatus.${status}`)}
              </span>
            </article>
          );
        })}
      </section>
    </>
  );
}
