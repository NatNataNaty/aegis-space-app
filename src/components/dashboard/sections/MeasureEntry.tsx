import { Check, Stethoscope } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { INPUT_RANGE, parseMeasurement, useMeasurementsStore, type MeasureField } from "../../../features/measurements/measurements";
import { fmtClock, fmtNum } from "../../../lib/format";

const GROUPS: { id: string; fields: MeasureField[]; unit: string; step: string }[] = [
  { id: "pressure", fields: ["systolic", "diastolic"], unit: "mmHg", step: "1" },
  { id: "heartRate", fields: ["heartRate"], unit: "bpm", step: "1" },
  { id: "spo2", fields: ["spo2"], unit: "%", step: "1" },
  { id: "temperature", fields: ["temperature"], unit: "°C", step: "0.1" },
  { id: "glucose", fields: ["glucose"], unit: "mg/dL", step: "1" },
];

/**
 * «Registrar medición»: el tripulante escribe lo que marca el aparato del botiquín
 * (tensiómetro, pulsioxímetro, termómetro, glucómetro). Se guarda a bordo y viaja a la Tierra.
 */
export function MeasureEntry() {
  const { t } = useTranslation();
  const items = useMeasurementsStore((s) => s.items);
  const add = useMeasurementsStore((s) => s.add);
  const [raw, setRaw] = useState<Partial<Record<MeasureField, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const last = items[0];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = parseMeasurement(raw, Date.now());
    if (!res.success) {
      const msg = res.error.issues[0]?.message;
      setError(t(`measure.error.${msg === "empty" || msg === "pressurePair" || msg === "pressureOrder" ? msg : "range"}`));
      return;
    }
    setError(null);
    add(res.data);
    setRaw({});
  };

  return (
    <article className="panel measure">
      <header className="panel__head">
        <div>
          <h3>
            <Stethoscope size={20} aria-hidden /> {t("measure.title")}
          </h3>
          <p className="panel__sub">{t("measure.sub")}</p>
        </div>
      </header>

      <form className="measure__form" onSubmit={submit} noValidate>
        {GROUPS.map((g) => (
          <fieldset key={g.id} className="measure__group">
            <legend>{t(`measure.field.${g.id}`)}</legend>
            <div className="measure__inputs">
              {g.fields.map((f, i) => (
                <span key={f} className="measure__input">
                  {i > 0 && <span aria-hidden>/</span>}
                  <input
                    type="number"
                    inputMode="decimal"
                    step={g.step}
                    min={INPUT_RANGE[f][0]}
                    max={INPUT_RANGE[f][1]}
                    aria-label={t(`measure.aria.${f}`)}
                    placeholder={g.fields.length > 1 ? t(`measure.ph.${f}`) : "—"}
                    value={raw[f] ?? ""}
                    onChange={(e) => setRaw((r) => ({ ...r, [f]: e.target.value }))}
                  />
                </span>
              ))}
              <em>{g.unit === "bpm" ? t("measure.bpm") : g.unit}</em>
            </div>
            <small>{t(`measure.how.${g.id}`)}</small>
          </fieldset>
        ))}

        <div className="form__foot measure__foot">
          <button type="submit" className="btn btn--primary">
            <Check size={16} aria-hidden /> {t("measure.save")}
          </button>
          <p className="measure__msg" role={error ? "alert" : "status"} aria-live="polite">
            {error ?? (last ? t("measure.saved", { time: fmtClock(last.recordedAt, false) }) : t("measure.devices"))}
          </p>
        </div>
      </form>

      {items.length > 0 && (
        <>
          <h4 className="subhead">{t("measure.history")}</h4>
          <ul className="history measure__history">
            {items.slice(0, 5).map((m) => (
              <li key={m.recordedAt}>
                <span className="history__title">{fmtClock(m.recordedAt, false)}</span>
                <span className="history__meta">
                  {[
                    m.systolic !== undefined ? `${m.systolic}/${m.diastolic} mmHg` : null,
                    m.heartRate !== undefined ? `${m.heartRate} ${t("measure.bpm")}` : null,
                    m.spo2 !== undefined ? `SpO₂ ${m.spo2} %` : null,
                    m.temperature !== undefined ? `${fmtNum(m.temperature, 1)} °C` : null,
                    m.glucose !== undefined ? `${m.glucose} mg/dL` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}
