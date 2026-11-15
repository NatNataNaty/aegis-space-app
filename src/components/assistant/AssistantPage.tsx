import { Check, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { answer, type AssistantAnswer } from "../../features/assistant/assistant";
import { useBaselineStore } from "../../features/baseline/personalBaseline";
import { toMissionTime } from "../../features/mission/missionClock";
import { fmtClock } from "../../lib/format";
import { useHealthStore } from "../../stores/health.store";
import { useMissionStore } from "../../stores/mission.store";
import type { ModuleId } from "../layout/ModuleRail";

interface Turn {
  q: string;
  a: AssistantAnswer;
}

const QUICK = ["today", "oxygen", "radiation", "sleepWeek", "sleepWhy", "logSymptom"] as const;

/** Asistente de a bordo: preguntas frecuentes respondidas con tus datos y la biblioteca, con su fuente. */
export function AssistantPage({ onGo }: { onGo: (m: ModuleId) => void }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const snap = useHealthStore((s) => s.snapshot);
  const alerts = useHealthStore((s) => s.activeAlerts.filter((a) => a.level !== "info").length);
  const report = useHealthStore((s) => s.selfReport);
  const baseline = useBaselineStore((s) => s.stats);
  const missionMs = useMissionStore((s) => s.missionMs);
  const day = toMissionTime(missionMs).day;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const ask = (q: string) => {
    const text = q.trim();
    if (!text) return;
    const a = answer(text, { snap, baseline, alerts, day, lang: i18n.language, t: (k, v) => String(t(k, v ?? {})) });
    setTurns((list) => [...list, { q: text, a }]);
    setDraft("");
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns.length]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(draft);
  };

  const sees: [string, string][] = [
    [t("assistant.sees.vitals"), t("assistant.sees.vitalsSub")],
    [t("assistant.sees.sleep"), t("mission.day", { day })],
    [t("assistant.sees.feel"), report ? t("assistant.sees.feelLast", { time: fmtClock(report.recordedAt, false) }) : t("assistant.sees.feelNone")],
    [t("assistant.sees.library"), t("assistant.sees.librarySub")],
  ];

  return (
    <div className="assistant">
      <section className="card chat" aria-labelledby="chat-title">
        <header className="chat__head">
          <h2 id="chat-title" className="card__title">
            {t("modules.assistant")}
          </h2>
          <span className="badge badge--camera_live">{t("assistant.tag")}</span>
        </header>

        <div className="chat__log" aria-live="polite">
          {turns.length === 0 && <p className="chat__empty">{t("assistant.empty")}</p>}
          {turns.map((turn, i) => (
            <div key={i} className="chat__turn">
              <p className="chat__q">{turn.q}</p>
              <div className="chat__a">
                <span className="chat__icon" aria-hidden>
                  <Sparkles size={16} />
                </span>
                <div className="chat__bubble">
                  <p>{turn.a.text}</p>
                  <span className="chat__src">
                    {turn.a.source.url ? (
                      <a href={turn.a.source.url} target="_blank" rel="noreferrer">
                        {turn.a.source.label}
                      </a>
                    ) : (
                      turn.a.source.label
                    )}
                  </span>
                  {turn.a.action === "log" && (
                    <button type="button" className="dbtn dbtn--primary chat__act" onClick={() => onGo("log")}>
                      {t("assistant.openLog")}
                    </button>
                  )}
                  {turn.a.action === "emergency" && (
                    <button type="button" className="dbtn chat__act" onClick={() => navigate("/emergencia")}>
                      {t("nav.emergency")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <form className="chat__form" onSubmit={onSubmit}>
          <label className="sr-only" htmlFor="chat-input">
            {t("assistant.placeholder")}
          </label>
          <input
            id="chat-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("assistant.placeholder")}
            autoComplete="off"
            maxLength={200}
          />
          <button type="submit" className="dbtn dbtn--primary" disabled={!draft.trim()}>
            <Send size={16} aria-hidden /> {t("assistant.send")}
          </button>
        </form>
      </section>

      <aside className="assistant__side">
        <section className="card" aria-labelledby="quick-q">
          <h2 id="quick-q" className="card__title">
            {t("assistant.quickTitle")}
          </h2>
          <div className="quickq">
            {QUICK.map((id) => (
              <button key={id} type="button" className="quickq__btn" onClick={() => ask(t(`assistant.q.${id}`))}>
                {t(`assistant.q.${id}`)}
              </button>
            ))}
          </div>
        </section>
        <section className="card" aria-labelledby="sees-title">
          <h2 id="sees-title" className="card__title">
            {t("assistant.seesTitle")}
          </h2>
          <p className="muted small">{t("assistant.seesSub")}</p>
          <ul className="sees">
            {sees.map(([a, b]) => (
              <li key={a}>
                <Check size={16} aria-hidden />
                <span>
                  {a}
                  <small>{b}</small>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
