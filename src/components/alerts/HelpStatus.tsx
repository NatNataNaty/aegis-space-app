import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { protocolPath } from "../../app/paths";
import { useBuddyStore } from "../../stores/buddy.store";

/** Si nadie confirma en este tiempo, se pide ayuda por otra vía (no se finge que llegó). */
const NO_ACK_HINT_MS = 20_000;

/** Estado del aviso enviado: solo dice «viene en camino» cuando el compañero lo confirma. */
export function HelpStatus() {
  const { t, i18n } = useTranslation();
  const outgoing = useBuddyStore((s) => s.outgoing);
  const cancel = useBuddyStore((s) => s.cancelOutgoing);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!outgoing || outgoing.acknowledgedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [outgoing]);

  if (!outgoing) return null;

  const { call, delivered, acknowledgedAt } = outgoing;
  const message = !delivered
    ? t("help.status.unsupported")
    : acknowledgedAt
      ? t("help.status.acknowledged")
      : now - call.at > NO_ACK_HINT_MS
        ? t("help.status.noAck")
        : t("help.status.sent");
  const tone = acknowledgedAt ? "ok" : !delivered || now - call.at > NO_ACK_HINT_MS ? "warn" : "info";

  return (
    <div className={`help-status help-status--${tone}`} role="status" aria-live="assertive">
      <p className="help-status__text">{message}</p>
      <div className="help-status__actions">
        {call.protocolId && (
          <Link className="mbtn mbtn--dark" to={protocolPath(call.protocolId, i18n.language)}>
            {t("help.openProtocol")}
          </Link>
        )}
        <button type="button" className="mbtn mbtn--ghost" onClick={cancel}>
          {acknowledgedAt ? t("help.status.close") : t("help.status.cancel")}
        </button>
      </div>
    </div>
  );
}
