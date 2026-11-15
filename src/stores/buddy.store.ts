import { activeCrew } from "../data/crew";
import { create } from "zustand";
import { newCallId, onBuddyMessage, postBuddyMessage, type HelpCall } from "../features/buddy/buddyChannel";
import { logEvent } from "../features/protocols/eventLog";
import { loadPref, savePref } from "../lib/storage";
import { useHealthStore } from "./health.store";

/** La alerta que originó una llamada queda atendida cuando alguien acude. */
function attendCall(call: HelpCall): void {
  useHealthStore.getState().attendAlerts((a) => (!!call.protocolId && a.protocolId === call.protocolId) || a.title === call.reason);
}

/** «¿Necesitas ayuda?» abierto por una alerta. */
export interface HelpPrompt {
  alertKey: string;
  alertId: string;
  title: string;
  protocolId: string | null;
  /** Momento en que se avisa solo al compañero si no hay respuesta. */
  deadline: number;
  buddyAfterSec: number;
  /** Aviso inmediato (buddyAfterSec = 0): el compañero ya está avisado al abrirse la pregunta. */
  autoSent: boolean;
}

/** Aviso enviado desde esta pantalla. */
export interface OutgoingCall {
  call: HelpCall;
  /** El aviso salió hacia otras pantallas (false si el navegador no lo permite). */
  delivered: boolean;
  acknowledgedAt: number | null;
  /** Quién respondió: otra pantalla («buddy») o alguien en esta misma nave («local»). */
  acknowledgedBy?: "buddy" | "local";
  /** La sirena de la nave se silenció (el aviso sigue visible). */
  muted?: boolean;
}

interface BuddyState {
  prompt: HelpPrompt | null;
  outgoing: OutgoingCall | null;
  /** Avisos recibidos de otras pantallas y aún sin atender. */
  incoming: HelpCall[];
  /** Alertas ya preguntadas → última vez vistas. No se repite la pregunta hasta que la alerta
   *  lleve FORGET_AFTER_MS sin aparecer (las señales simuladas oscilan entre niveles). */
  handledAlertKeys: Record<string, number>;

  openPrompt: (p: Omit<HelpPrompt, "deadline" | "autoSent">) => void;
  answerOk: () => void;
  /** Envía el aviso. Sin «¿Necesitas ayuda?» abierto, usa el protocolo y motivo indicados. */
  askForHelp: (auto: boolean, crewName: string, context?: { protocolId: string | null; reason: string }) => void;
  cancelOutgoing: () => void;
  /** Alguien en la nave oyó la alarma y va a ayudar. */
  localAck: () => void;
  muteAlarm: () => void;
  acknowledge: (id: string) => void;
  silence: (id: string) => void;
  forgetAlertKeys: (activeKeys: string[]) => void;
}

const FORGET_AFTER_MS = 60_000;

export const useBuddyStore = create<BuddyState>((set, get) => ({
  prompt: null,
  outgoing: null,
  incoming: [],
  // Se recuerda entre recargas: recargar la página no debe repetir la pregunta ni el aviso.
  handledAlertKeys: loadPref<Record<string, number>>("helpHandled", {}),

  openPrompt: (p) => {
    if (get().prompt || p.alertKey in get().handledAlertKeys) return;
    const autoSent = p.buddyAfterSec === 0;
    const prompt: HelpPrompt = { ...p, deadline: Date.now() + p.buddyAfterSec * 1000, autoSent };
    const handled = { ...get().handledAlertKeys, [p.alertKey]: Date.now() };
    savePref("helpHandled", handled);
    set({ prompt, handledAlertKeys: handled });
    void logEvent("help_prompt", { alert_id: p.alertId, protocol_id: p.protocolId });
    if (autoSent) {
      // Plan: para esta señal el aviso al compañero es inmediato; la pregunta se mantiene a la vista.
      const call: HelpCall = {
        type: "help",
        id: newCallId(),
        crewName: activeCrew().name,
        protocolId: p.protocolId,
        reason: p.title,
        auto: true,
        immediate: true,
        at: Date.now(),
      };
      const delivered = postBuddyMessage(call);
      set({ outgoing: { call, delivered, acknowledgedAt: null } });
      void logEvent("help_auto_sent", { alert_id: p.alertId, protocol_id: p.protocolId, delivered });
    }
  },

  answerOk: () => {
    const p = get().prompt;
    if (!p) return;
    if (p.autoSent) get().cancelOutgoing();
    set({ prompt: null });
    // «Estoy bien»: la alerta queda atendida y deja de mostrarse.
    useHealthStore.getState().attendAlerts((a) => a.id === p.alertId);
    void logEvent("help_answer_ok", { alert_id: p.alertId });
  },

  askForHelp: (auto, crewName, context) => {
    const p = get().prompt;
    if (p?.autoSent) {
      // Ya avisado: solo se cierra la pregunta.
      set({ prompt: null });
      return;
    }
    const call: HelpCall = {
      type: "help",
      id: newCallId(),
      crewName,
      protocolId: p?.protocolId ?? context?.protocolId ?? null,
      reason: p?.title ?? context?.reason ?? "",
      auto,
      at: Date.now(),
    };
    const delivered = postBuddyMessage(call);
    set({ prompt: null, outgoing: { call, delivered, acknowledgedAt: null } });
    void logEvent(auto ? "help_auto_sent" : "help_requested", {
      alert_id: p?.alertId ?? null,
      protocol_id: call.protocolId,
      delivered,
    });
  },

  cancelOutgoing: () => {
    const out = get().outgoing;
    if (out) postBuddyMessage({ type: "cancel", id: out.call.id, at: Date.now() });
    set({ outgoing: null });
  },

  localAck: () => {
    const out = get().outgoing;
    if (!out || out.acknowledgedAt) return;
    postBuddyMessage({ type: "ack", id: out.call.id, at: Date.now() });
    set({ outgoing: { ...out, acknowledgedAt: Date.now(), acknowledgedBy: "local" } });
    attendCall(out.call);
    void logEvent("help_acknowledged", { call_id: out.call.id, by: "local" });
  },

  muteAlarm: () => {
    const out = get().outgoing;
    if (out) set({ outgoing: { ...out, muted: true } });
  },

  acknowledge: (id) => {
    postBuddyMessage({ type: "ack", id, at: Date.now() });
    set({ incoming: get().incoming.filter((c) => c.id !== id) });
    void logEvent("help_acknowledged", { call_id: id });
  },

  silence: (id) => set({ incoming: get().incoming.filter((c) => c.id !== id) }),

  forgetAlertKeys: (activeKeys) => {
    const now = Date.now();
    const next: Record<string, number> = {};
    let changed = false;
    for (const [k, seen] of Object.entries(get().handledAlertKeys)) {
      if (activeKeys.includes(k)) {
        next[k] = now;
        changed ||= now - seen > 5_000;
      } else if (now - seen < FORGET_AFTER_MS) next[k] = seen;
      else changed = true;
    }
    if (changed) {
      savePref("helpHandled", next);
      set({ handledAlertKeys: next });
    }
  },
}));

// Mensajes de otras pantallas.
onBuddyMessage((m) => {
  const s = useBuddyStore.getState();
  if (m.type === "help") {
    if (!s.incoming.some((c) => c.id === m.id)) useBuddyStore.setState({ incoming: [...s.incoming, m] });
  } else if (m.type === "ack") {
    if (s.outgoing?.call.id === m.id && !s.outgoing.acknowledgedAt) {
      useBuddyStore.setState({ outgoing: { ...s.outgoing, acknowledgedAt: m.at, acknowledgedBy: "buddy" } });
      attendCall(s.outgoing.call);
    }
  } else if (m.type === "cancel") {
    useBuddyStore.setState({ incoming: s.incoming.filter((c) => c.id !== m.id) });
  }
});
