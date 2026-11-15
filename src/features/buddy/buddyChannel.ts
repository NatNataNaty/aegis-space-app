/**
 * Aviso al compañero sin red (plan maestro: «BroadcastChannel + Web Audio + vibración»).
 *
 * Alcance real: BroadcastChannel llega a las demás pestañas y ventanas de aegis abiertas en el
 * MISMO navegador del dispositivo (por ejemplo, la tableta de la nave y la pantalla del módulo).
 * El aviso entre dispositivos por red local queda para después de la entrega. Por eso la interfaz
 * solo dice «viene en camino» cuando otra pantalla confirma con «Voy a ayudar».
 */

export interface HelpCall {
  type: "help";
  id: string;
  crewName: string;
  /** Protocolo que se abre en modo compañero. */
  protocolId: string | null;
  /** Título de la alerta en el idioma de quien la envía. */
  reason: string;
  /** true si se envió sola tras la cuenta atrás (sin respuesta del tripulante). */
  auto: boolean;
  /** Aviso inmediato por la regla de la señal (no por falta de respuesta). */
  immediate?: boolean;
  at: number;
}

export interface HelpAck {
  type: "ack";
  id: string;
  at: number;
}

export interface HelpCancel {
  type: "cancel";
  id: string;
  at: number;
}

export type BuddyMessage = HelpCall | HelpAck | HelpCancel;

const CHANNEL = "aegis-buddy";

let channel: BroadcastChannel | null = null;
const listeners = new Set<(m: BuddyMessage) => void>();

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (e: MessageEvent<BuddyMessage>) => {
      if (isBuddyMessage(e.data)) listeners.forEach((fn) => fn(e.data));
    };
  }
  return channel;
}

export function isBuddyMessage(value: unknown): value is BuddyMessage {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || typeof v.at !== "number") return false;
  if (v.type === "ack" || v.type === "cancel") return true;
  return v.type === "help" && typeof v.crewName === "string" && typeof v.reason === "string" && typeof v.auto === "boolean";
}

/** true si el navegador permite avisar a otras pantallas. */
export const buddyChannelAvailable = (): boolean => typeof BroadcastChannel !== "undefined";

export function postBuddyMessage(message: BuddyMessage): boolean {
  const ch = getChannel();
  if (!ch) return false;
  ch.postMessage(message);
  return true;
}

export function onBuddyMessage(fn: (m: BuddyMessage) => void): () => void {
  getChannel();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const newCallId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/* ---------- Sonido y vibración (sin archivos: tono generado con Web Audio) ---------- */

let audio: AudioContext | null = null;

/** Dos tonos cortos. Si el navegador bloquea el audio, la alarma sigue siendo visual. */
export function playAlarm(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audio ??= new Ctx();
    const now = audio.currentTime;
    for (const [i, freq] of [880, 660].entries()) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.28);
      gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.28 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.28 + 0.24);
      osc.connect(gain).connect(audio.destination);
      osc.start(now + i * 0.28);
      osc.stop(now + i * 0.28 + 0.26);
    }
  } catch {
    /* sin audio: la alarma visual basta */
  }
  try {
    // Los navegadores solo permiten vibrar tras un toque del usuario en la página.
    if (navigator.userActivation?.hasBeenActive ?? true) navigator.vibrate?.([200, 100, 200]);
  } catch {
    /* sin vibración */
  }
}
