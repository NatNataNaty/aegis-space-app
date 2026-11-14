import { Check, Timer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { median } from "../../../features/camera/eyeAspectRatio";
import { cx, fmtClock, fmtNum } from "../../../lib/format";
import { useHealthStore } from "../../../stores/health.store";
import { InfoTip } from "../../common/InfoTip";
import { OriginBadge } from "../../common/OriginBadge";
import { useTranslation } from "react-i18next";

// `value` es lo que se guarda (lo leen las reglas de alerta de P4): no cambiarlo. Lo visible sale de i18n.
const SYMPTOMS = [
  { value: "Dolor de cabeza", key: "headache" },
  { value: "Náuseas", key: "nausea" },
  { value: "Mareo", key: "dizziness" },
  { value: "Visión borrosa", key: "blurred" },
  { value: "Congestión", key: "congestion" },
  { value: "Dolor lumbar", key: "backPain" },
] as const;

function Scale({ label, value, onChange, low, high }: { label: string; value: number; onChange: (v: number) => void; low: string; high: string }) {
  return (
    <fieldset className="scale">
      <legend>{label}</legend>
      <div className="scale__row">
        <span className="scale__end">{low}</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={cx("scale__btn", value === n && "scale__btn--on")}
            aria-pressed={value === n}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
        <span className="scale__end">{high}</span>
      </div>
    </fieldset>
  );
}

function Questionnaire() {
  const { t } = useTranslation();
  const saved = useHealthStore((s) => s.selfReport);
  const setSelfReport = useHealthStore((s) => s.setSelfReport);
  const [fatigue, setFatigue] = useState(saved?.fatigue ?? 2);
  const [mood, setMood] = useState(saved?.mood ?? 4);
  const [stress, setStress] = useState(saved?.stress ?? 2);
  const [symptoms, setSymptoms] = useState<string[]>(saved?.symptoms ?? []);

  const toggle = (s: string) => setSymptoms((list) => (list.includes(s) ? list.filter((x) => x !== s) : [...list, s]));

  return (
    <article className="panel">
      <header className="panel__head">
        <div>
          <h3>{t("sections.self.title")}</h3>
          <p className="panel__sub">{t("sections.self.sub")}</p>
        </div>
        <OriginBadge origin="user_reported" />
      </header>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          setSelfReport({ fatigue, mood, stress, symptoms, recordedAt: Date.now() });
        }}
      >
        <Scale label={t("sections.self.fatigue")} value={fatigue} onChange={setFatigue} low={t("sections.self.low")} high={t("sections.self.high")} />
        <Scale label={t("sections.self.mood")} value={mood} onChange={setMood} low={t("sections.self.lowM")} high={t("sections.self.good")} />
        <Scale label={t("sections.self.stress")} value={stress} onChange={setStress} low={t("sections.self.lowM")} high={t("sections.self.highM")} />
        <fieldset className="symptoms">
          <legend>{t("sections.self.symptoms")}</legend>
          <div className="symptoms__list">
            {SYMPTOMS.map(({ value: s, key }) => (
              <label key={s} className={cx("check", symptoms.includes(s) && "check--on")}>
                <input type="checkbox" checked={symptoms.includes(s)} onChange={() => toggle(s)} />
                {t(`sections.self.symptom.${key}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="form__foot">
          <button type="submit" className="btn btn--primary">
            <Check size={16} aria-hidden /> {t("sections.self.save")}
          </button>
          {saved && <span className="muted">{t("sections.self.savedAt", { time: fmtClock(saved.recordedAt, false) })}</span>}
        </div>
      </form>
    </article>
  );
}

type Phase = "idle" | "waiting" | "go" | "early" | "done";
const TRIALS = 5;

function ReactionTest() {
  const { t } = useTranslation();
  const result = useHealthStore((s) => s.reactionTest);
  const setReactionTest = useHealthStore((s) => s.setReactionTest);
  const [phase, setPhase] = useState<Phase>("idle");
  const [trials, setTrials] = useState<number[]>([]);
  const timer = useRef<number | null>(null);
  const shownAt = useRef(0);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const arm = () => {
    setPhase("waiting");
    timer.current = window.setTimeout(() => {
      shownAt.current = performance.now();
      setPhase("go");
    }, 1200 + Math.random() * 2300);
  };

  const start = () => {
    setTrials([]);
    arm();
  };

  const press = () => {
    if (phase === "waiting") {
      if (timer.current) window.clearTimeout(timer.current);
      setPhase("early");
      return;
    }
    if (phase === "early") {
      arm();
      return;
    }
    if (phase !== "go") return;
    const rt = performance.now() - shownAt.current;
    const next = [...trials, rt];
    setTrials(next);
    if (next.length >= TRIALS) {
      setPhase("done");
      setReactionTest({
        trialsMs: next,
        meanMs: next.reduce((a, b) => a + b, 0) / next.length,
        medianMs: median(next) ?? 0,
        recordedAt: Date.now(),
      });
    } else {
      arm();
    }
  };

  const running = phase === "waiting" || phase === "go" || phase === "early";

  return (
    <article className="panel">
      <header className="panel__head">
        <div>
          <h3>
            <Timer size={16} aria-hidden /> {t("sections.self.reaction")} <InfoTip metric="reaction" />
          </h3>
          <p className="panel__sub">{t("sections.self.reactionSub", { n: TRIALS })}</p>
        </div>
        <OriginBadge origin="local_test" />
      </header>

      <button
        type="button"
        className={cx("reaction", `reaction--${phase}`)}
        onClick={running ? press : start}
        onKeyDown={(e) => {
          if (running && (e.key === " " || e.key === "Enter")) {
            e.preventDefault();
            press();
          }
        }}
      >
        {phase === "idle" && t("sections.self.startTest")}
        {phase === "waiting" && t("sections.self.wait")}
        {phase === "go" && t("sections.self.go")}
        {phase === "early" && t("sections.self.early")}
        {phase === "done" && t("sections.self.repeat")}
        {running && <span className="reaction__count">{trials.length} / {TRIALS}</span>}
      </button>

      {result && (
        <div className="kv-grid kv-grid--3">
          <div>
            <span className="kv__label">{t("sections.self.median")}</span>
            <span className="kv__value kv__value--lg">{fmtNum(result.medianMs)} ms</span>
          </div>
          <div>
            <span className="kv__label">{t("sections.self.mean")}</span>
            <span className="kv__value">{fmtNum(result.meanMs)} ms</span>
          </div>
          <div>
            <span className="kv__label">{t("sections.self.recorded")}</span>
            <span className="kv__value">{fmtClock(result.recordedAt, false)}</span>
          </div>
        </div>
      )}
    </article>
  );
}

export function SelfCheckSection() {
  return (
    <div className="section-grid section-grid--wide">
      <Questionnaire />
      <ReactionTest />
    </div>
  );
}
