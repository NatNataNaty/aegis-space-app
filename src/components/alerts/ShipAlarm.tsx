import { Siren, VolumeX } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { protocolPath } from "../../app/paths";
import { playSiren } from "../../features/buddy/buddyChannel";
import { useBuddyStore } from "../../stores/buddy.store";

/**
 * Alarma de la nave: en cuanto se pide ayuda (botón o falta de respuesta), suena la sirena en esta
 * tableta y aparece el aviso para que cualquier tripulante que esté cerca acuda. Sigue sonando hasta
 * que alguien pulse «Voy a ayudar» (aquí o en otra pantalla) o se silencie.
 */
export function ShipAlarm() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const outgoing = useBuddyStore((s) => s.outgoing);
  const localAck = useBuddyStore((s) => s.localAck);
  const muteAlarm = useBuddyStore((s) => s.muteAlarm);
  const cancelOutgoing = useBuddyStore((s) => s.cancelOutgoing);
  const answerOk = useBuddyStore((s) => s.answerOk);
  const hasPrompt = useBuddyStore((s) => s.prompt !== null);
  // «Falsa alarma»: se cancela el aviso y, si venía de una alerta, se responde «Estoy bien».
  const cancel = () => (hasPrompt ? answerOk() : cancelOutgoing());
  const goButton = useRef<HTMLButtonElement>(null);
  const ringing = !!outgoing && !outgoing.acknowledgedAt;
  const muted = !!outgoing?.muted;

  useEffect(() => {
    if (!ringing) return;
    goButton.current?.focus();
    if (muted) return;
    playSiren();
    const id = window.setInterval(playSiren, 1300);
    return () => window.clearInterval(id);
  }, [ringing, muted]);

  if (!ringing || !outgoing) return null;
  const { call } = outgoing;

  const goHelp = () => {
    localAck();
    if (call.protocolId) navigate(`${protocolPath(call.protocolId, i18n.language)}?modo=companero&aviso=1`);
  };

  return (
    <div className="ship-alarm" role="alertdialog" aria-modal="true" aria-labelledby="ship-alarm-title" aria-describedby="ship-alarm-desc">
      <div className="ship-alarm__panel">
        <p className="ship-alarm__kicker">
          <Siren size={22} aria-hidden /> {call.auto ? t("shipAlarm.noAnswer") : t("shipAlarm.asked")}
        </p>
        <h1 id="ship-alarm-title" className="ship-alarm__title">
          {t("shipAlarm.title", { name: call.crewName })}
        </h1>
        <p id="ship-alarm-desc" className="ship-alarm__reason">
          {call.reason}
        </p>
        <button ref={goButton} type="button" className="ship-alarm__go" onClick={goHelp}>
          {t("shipAlarm.going")}
        </button>
        <div className="ship-alarm__row">
          {!muted && (
            <button type="button" className="mbtn mbtn--ghost" onClick={muteAlarm}>
              <VolumeX size={18} aria-hidden /> {t("shipAlarm.mute")}
            </button>
          )}
          <button type="button" className="mbtn mbtn--ghost" onClick={cancel}>
            {t("shipAlarm.falseAlarm")}
          </button>
        </div>
        <p className="ship-alarm__note">{t("shipAlarm.note")}</p>
      </div>
    </div>
  );
}
