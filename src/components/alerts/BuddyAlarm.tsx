import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { protocolPath } from "../../app/paths";
import { playAlarm } from "../../features/buddy/buddyChannel";
import { useBuddyStore } from "../../stores/buddy.store";

/** Lo que ve el compañero: alarma con sonido y vibración hasta que alguien responde. */
export function BuddyAlarm() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const call = useBuddyStore((s) => s.incoming[0]);
  const acknowledge = useBuddyStore((s) => s.acknowledge);
  const silence = useBuddyStore((s) => s.silence);
  const helpButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!call) return;
    helpButton.current?.focus();
    playAlarm();
    const id = window.setInterval(playAlarm, 3000);
    return () => window.clearInterval(id);
  }, [call]);

  if (!call) return null;

  const goHelp = () => {
    acknowledge(call.id);
    if (call.protocolId) navigate(`${protocolPath(call.protocolId, i18n.language)}?modo=companero`);
  };

  return (
    <div className="help help--buddy" role="alertdialog" aria-modal="true" aria-labelledby="buddy-title" aria-describedby="buddy-desc">
      <div className="help__panel">
        <p className="help__reason">{call.immediate ? t("buddy.immediate") : call.auto ? t("buddy.noAnswer") : t("buddy.asked")}</p>
        <h1 id="buddy-title" className="help__title">
          {t("buddy.title", { name: call.crewName })}
        </h1>
        <p id="buddy-desc" className="help__desc">
          {call.reason}
        </p>
        <button ref={helpButton} type="button" className="mbtn mbtn--amber help__btn" onClick={goHelp}>
          {t("buddy.going")}
        </button>
        <button type="button" className="mbtn mbtn--ghost help__btn" onClick={() => silence(call.id)}>
          {t("buddy.silence")}
        </button>
      </div>
    </div>
  );
}
