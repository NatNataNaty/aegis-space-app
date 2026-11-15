import { activeCrew } from "../../data/crew";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { protocolPath } from "../../app/paths";
import { useBuddyStore } from "../../stores/buddy.store";

/**
 * «¿Necesitas ayuda?» a pantalla completa (plan: umbral superado → pregunta → sin respuesta en
 * N s → aviso al compañero → enlace directo al protocolo). Nadie tiene que buscar en menús.
 */
export function HelpOverlay() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const prompt = useBuddyStore((s) => s.prompt);
  const answerOk = useBuddyStore((s) => s.answerOk);
  const askForHelp = useBuddyStore((s) => s.askForHelp);
  const [now, setNow] = useState(() => Date.now());
  const firstButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const crewName = activeCrew().name;
  const goToProtocol = (id: string | null) => {
    if (id) navigate(protocolPath(id, i18n.language));
  };

  const sendHelp = (auto: boolean) => {
    const id = prompt?.protocolId ?? null;
    askForHelp(auto, crewName);
    goToProtocol(id);
  };

  // Cuenta atrás; al llegar a 0 se avisa solo (también si buddyAfterSec es 0: aviso inmediato).
  useEffect(() => {
    if (!prompt) return;
    firstButton.current?.focus();
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [prompt]);

  const left = prompt ? Math.max(0, Math.ceil((prompt.deadline - now) / 1000)) : 0;
  useEffect(() => {
    if (prompt && !prompt.autoSent && Date.now() >= prompt.deadline) sendHelp(true);
  }, [prompt, left]);

  if (!prompt) return null;

  // Foco atrapado dentro del aviso: Tab no puede salir a la página de detrás.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !panel.current) return;
    const items = panel.current.querySelectorAll<HTMLElement>("button, a[href]");
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const total = Math.max(1, prompt.buddyAfterSec);

  return (
    <div className="help" role="alertdialog" aria-modal="true" aria-labelledby="help-title" aria-describedby="help-desc" onKeyDown={onKeyDown}>
      <div className="help__panel" ref={panel}>
        <p className="help__reason">{prompt.title}</p>
        <h1 id="help-title" className="help__title">
          {t("help.title")}
        </h1>
        {prompt.autoSent ? (
          <p id="help-desc" className="help__desc" aria-live="assertive">
            {t("help.autoSent")}
          </p>
        ) : (
          <div className="help__count" aria-live="polite">
            <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
              <circle cx="32" cy="32" r="28" className="help__track" />
              <circle cx="32" cy="32" r="28" className="help__arc" pathLength={total} strokeDasharray={`${left} ${total}`} />
            </svg>
            <p id="help-desc">{t("help.countdown", { s: left })}</p>
          </div>
        )}
        <button ref={firstButton} type="button" className="mbtn mbtn--amber help__btn" onClick={() => sendHelp(false)}>
          {prompt.autoSent ? t("help.openProtocol") : t("help.needHelp")}
        </button>
        <button type="button" className="mbtn mbtn--ghost help__btn" onClick={answerOk}>
          {prompt.autoSent ? t("help.imOkCancel") : t("help.imOk")}
        </button>
        {prompt.protocolId && !prompt.autoSent && (
          <a
            className="help__link"
            href={protocolPath(prompt.protocolId, i18n.language)}
            onClick={(e) => {
              e.preventDefault();
              answerOk();
              goToProtocol(prompt.protocolId);
            }}
          >
            {t("help.openProtocol")}
          </a>
        )}
      </div>
    </div>
  );
}
