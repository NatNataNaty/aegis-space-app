import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { cx } from "../../lib/format";
import { protocolPath } from "../../app/paths";
import type { HeroMood } from "../dashboard/MarsHero";

/**
 * Pasos de DEMOSTRACIÓN del protocolo «Frecuencia cardíaca anormal».
 * Solo acciones no clínicas; el paso clínico queda marcado como pendiente de revisión médica.
 * Cuando P2 publique /content/protocols, estos pasos se sustituyen por los del contenido.
 * El aviso real al compañero (30 s) lo implementa P4 en features/buddy; aquí solo se muestra la interfaz.
 */
interface DemoStep {
  key: string;
  timerSec?: number;
  pendingReview?: boolean;
}

const STEPS: DemoStep[] = [
  { key: "stop" },
  { key: "breathe", timerSec: 120 },
  { key: "askHelp" },
  { key: "clinical", pendingReview: true },
];

const BUDDY_TIMEOUT_SEC = 30;

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

type Response = "none" | "ok" | "help";

export function StepsPanel({ mood, onLogSymptom }: { mood: HeroMood; onLogSymptom: () => void }) {
  const { t, i18n } = useTranslation();
  const [current, setCurrent] = useState(0);
  const [doneAt, setDoneAt] = useState<string[]>([]);
  const [left, setLeft] = useState<number | null>(STEPS[0].timerSec ?? null);
  const [response, setResponse] = useState<Response>("none");
  const [buddyLeft, setBuddyLeft] = useState(BUDDY_TIMEOUT_SEC);
  const active = mood === "alert";

  // Al entrar en alerta se reinicia el protocolo de demostración.
  useEffect(() => {
    if (!active) return;
    setCurrent(0);
    setDoneAt([]);
    setLeft(STEPS[0].timerSec ?? null);
    setResponse("none");
    setBuddyLeft(BUDDY_TIMEOUT_SEC);
  }, [active]);

  // Temporizador del paso actual.
  useEffect(() => {
    if (!active || left === null || left <= 0) return;
    const id = window.setTimeout(() => setLeft((v) => (v === null ? v : v - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [active, left]);

  // Cuenta atrás del aviso al compañero mientras no haya respuesta.
  useEffect(() => {
    if (!active || response !== "none" || buddyLeft <= 0) return;
    const id = window.setTimeout(() => setBuddyLeft((v) => v - 1), 1000);
    return () => window.clearTimeout(id);
  }, [active, response, buddyLeft]);

  const markDone = () => {
    const now = new Date().toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" });
    setDoneAt((d) => [...d, now]);
    const next = current + 1;
    setCurrent(next);
    setLeft(STEPS[next]?.timerSec ?? null);
  };

  if (!active) {
    return (
      <aside className="steps steps--calm" aria-labelledby="steps-title">
        <h2 id="steps-title" className="steps__title">
          {mood === "watch" ? t("steps.watchTitle") : t("steps.calmTitle")}
        </h2>
        <p className="steps__lead">{mood === "watch" ? t("steps.watchLead") : t("steps.calmLead")}</p>
        <div className="steps__spacer" />
        <button type="button" className="mbtn mbtn--ghost" onClick={onLogSymptom}>
          {t("steps.logSymptom")}
        </button>
      </aside>
    );
  }

  const buddyNotified = response === "help" || buddyLeft <= 0;
  const finished = current >= STEPS.length;

  return (
    <aside className="steps" aria-labelledby="steps-title">
      <div className="steps__head">
        <h2 id="steps-title" className="steps__title">
          {t("steps.title")}
        </h2>
        <Link className="steps__full" to={protocolPath("frecuencia-cardiaca", i18n.language)}>
          {t("steps.fullProtocol")}
        </Link>
      </div>

      <ol className="steps__list">
        {STEPS.map((s, i) => {
          const state = i < current ? "done" : i === current ? "current" : "next";
          return (
            <li key={s.key} className={cx("step", `step--${state}`)} aria-current={state === "current" ? "step" : undefined}>
              <span className="step__num">{state === "done" ? <Check size={22} aria-hidden /> : i + 1}</span>
              <div className="step__body">
                <span className="step__text">{t(`steps.items.${s.key}`)}</span>
                {state === "done" && <span className="step__meta">{t("steps.doneAt", { time: doneAt[i] })}</span>}
                {s.pendingReview && <span className="step__pending">{t("medical.pendingReview")}</span>}
                {state === "current" && (
                  <span className="step__actions">
                    {left !== null && (
                      <span className={cx("step__timer", left === 0 && "step__timer--end")} aria-live="off">
                        {mmss(left)}
                      </span>
                    )}
                    <button type="button" className="mbtn mbtn--dark" onClick={markDone}>
                      {t("steps.done")}
                    </button>
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {finished && <p className="steps__finished" role="status">{t("steps.finished")}</p>}

      <div className="steps__spacer" />

      <div className={cx("buddy", buddyNotified && "buddy--sent")} role="status" aria-live="polite">
        {response === "ok" ? (
          t("steps.buddy.ok")
        ) : buddyNotified ? (
          t("steps.buddy.sent")
        ) : (
          <>
            <svg className="buddy__ring" width="36" height="36" viewBox="0 0 36 36" aria-hidden>
              <circle cx="18" cy="18" r="15" className="buddy__track" />
              <circle
                cx="18"
                cy="18"
                r="15"
                className="buddy__arc"
                pathLength={BUDDY_TIMEOUT_SEC}
                strokeDasharray={`${buddyLeft} ${BUDDY_TIMEOUT_SEC}`}
              />
            </svg>
            {t("steps.buddy.countdown", { s: buddyLeft })}
          </>
        )}
      </div>

      <button type="button" className="mbtn mbtn--amber" onClick={() => setResponse("help")} disabled={response === "help"}>
        {t("steps.needHelp")}
      </button>
      <div className="steps__row">
        <button type="button" className="mbtn mbtn--ghost" onClick={() => setResponse("ok")} disabled={response !== "none"}>
          {t("steps.imOk")}
        </button>
        <button type="button" className="mbtn mbtn--ghost" onClick={onLogSymptom}>
          {t("steps.logSymptom")}
        </button>
      </div>
    </aside>
  );
}
