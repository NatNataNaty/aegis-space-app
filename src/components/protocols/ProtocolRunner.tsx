import { BellRing, Check, ClipboardCheck, Hand, ShieldAlert, Stethoscope } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { activeCrew } from "../../data/crew";
import { enqueueOutboxItem } from "../../features/link/outboxService";
import { logEvent } from "../../features/protocols/eventLog";
import { pick } from "../../lib/content";
import { cx } from "../../lib/format";
import type { Protocol, StepKind } from "../../lib/schemas/content";

export type RunMode = "solo" | "buddy";

const KIND_ICON: Record<StepKind, typeof Check> = {
  safety: ShieldAlert,
  action: Hand,
  notify: BellRing,
  clinical: Stethoscope,
  record: ClipboardCheck,
};

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

/** Ejecuta un protocolo: un paso cada vez, «Hecho» grande y la hora de cada paso registrada. */
export function ProtocolRunner({ protocol, mode, compact = false }: { protocol: Protocol; mode: RunMode; compact?: boolean }) {
  const { t, i18n } = useTranslation();
  const steps = mode === "solo" ? protocol.solo : protocol.withBuddy;
  const [current, setCurrent] = useState(0);
  const [doneAt, setDoneAt] = useState<number[]>([]);
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const runId = useRef(`${protocol.id}-${startedAt}`);
  const logged = useRef(false);
  const finished = current >= steps.length;

  useEffect(() => {
    // Una sola vez por ejecución (React monta dos veces los efectos en desarrollo).
    if (logged.current) return;
    logged.current = true;
    void logEvent("protocol_started", { protocol_id: protocol.id, mode, run_id: runId.current });
  }, [protocol.id, mode]);

  useEffect(() => {
    if (finished) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [finished]);

  const time = (ms: number) => new Date(ms).toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const markDone = () => {
    const at = Date.now();
    const step = steps[current];
    const nextDone = [...doneAt, at];
    setDoneAt(nextDone);
    setCurrent(current + 1);
    void logEvent("protocol_step_done", { protocol_id: protocol.id, step_id: step.id, run_id: runId.current });
    if (current + 1 >= steps.length) {
      void logEvent("protocol_finished", { protocol_id: protocol.id, run_id: runId.current });
      // Registro automático hacia la Tierra (plan: «cada paso queda guardado con su hora»).
      void enqueueOutboxItem("protocol_runs", {
        protocol_id: protocol.id,
        protocol_title: protocol.title.es,
        crew_id: activeCrew().id,
        status: "completed",
        review_status: protocol.reviewStatus,
        steps_data: steps.map((s, i) => ({ step_id: s.id, kind: s.kind, done_at: new Date(nextDone[i]).toISOString() })),
        outcome: null,
        started_at: new Date(startedAt).toISOString(),
        completed_at: new Date(at).toISOString(),
      }).catch(() => undefined);
    }
  };

  return (
    <div className={cx("runner", compact && "runner--compact")}>
      <p className="runner__elapsed" aria-live="off">
        {t("protocol.elapsed")} <strong>{mmss(Math.floor(((finished ? doneAt.at(-1) ?? now : now) - startedAt) / 1000))}</strong>
      </p>
      <ol className="runner__list">
        {steps.map((s, i) => {
          const state = i < current ? "done" : i === current ? "current" : "next";
          const Icon = KIND_ICON[s.kind];
          return (
            <li key={s.id} className={cx("step", `step--${state}`, `step--${s.kind}`)} aria-current={state === "current" ? "step" : undefined}>
              <span className="step__num">{state === "done" ? <Check size={22} aria-hidden /> : i + 1}</span>
              <div className="step__body">
                <span className="step__kind">
                  <Icon size={14} aria-hidden /> {t(`protocol.kind.${s.kind}`)}
                </span>
                <span className="step__text">{pick(s.text, i18n.language)}</span>
                {s.kind === "clinical" && <span className="step__pending">{t("medical.pendingReview")}</span>}
                {state === "done" && <span className="step__meta">{t("steps.doneAt", { time: time(doneAt[i]) })}</span>}
                {state === "current" && (
                  <span className="step__actions">
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
      {finished && (
        <p className="steps__finished" role="status">
          {t("steps.finished")}
        </p>
      )}
    </div>
  );
}
