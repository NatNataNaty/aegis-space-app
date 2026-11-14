import { useEffect } from "react";
import { useBuddyStore } from "../stores/buddy.store";
import { useHealthStore } from "../stores/health.store";

// Sin el nivel: una señal que oscila entre «Seguimiento» y «Atención» es la misma alerta.
const keyOf = (a: { id: string; protocolId: string | null }) => `${a.id}:${a.protocolId ?? "-"}`;

/**
 * Abre «¿Necesitas ayuda?» cuando aparece una alerta de nivel Atención que lo pide
 * (content/alerts.json). Si el tripulante responde «Estoy bien», no se vuelve a preguntar
 * por esa alerta hasta que lleve un minuto sin aparecer.
 */
export function useHelpWatcher(): void {
  useEffect(() => {
    const check = () => {
      const { activeAlerts: alerts, alertsEvaluated } = useHealthStore.getState();
      if (!alertsEvaluated) return;
      const buddy = useBuddyStore.getState();
      buddy.forgetAlertKeys(alerts.map(keyOf));
      const target = alerts.find((a) => a.askForHelp && a.level === "attention");
      if (target) {
        buddy.openPrompt({
          alertKey: keyOf(target),
          alertId: target.id,
          title: target.title,
          protocolId: target.protocolId,
          buddyAfterSec: target.buddyAfterSec,
        });
      }
    };
    check();
    return useHealthStore.subscribe(check);
  }, []);
}
