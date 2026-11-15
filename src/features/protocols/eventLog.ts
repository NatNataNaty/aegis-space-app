import Dexie, { type EntityTable } from "dexie";
import { create } from "zustand";
import {
  createVault,
  openVault,
  PURPOSE,
  seal,
  unseal,
  WrongPinError,
  type Sealed,
  type VaultRecord,
} from "../../lib/db/vaultCrypto";
import { enqueueOutboxItem } from "../link/outboxService";

/**
 * Registro local de lo que pasa a bordo (alertas respondidas, avisos, pasos de protocolo).
 *
 * - Cifrado en reposo con AES-GCM 256. La clave de datos está envuelta con una clave derivada
 *   del PIN del tripulante (PBKDF2-SHA-256, 600 000 iteraciones): ver lib/db/vaultCrypto.ts.
 *   El PIN nunca se guarda y la clave solo vive en memoria mientras el registro está abierto.
 * - Desbloquear NO es requisito para nada crítico: con el registro bloqueado, los eventos se
 *   guardan en memoria y se cifran al desbloquear. Emergencia y «¿Necesitas ayuda?» funcionan siempre.
 * - Cada evento se copia también a la bandeja de salida («guardar y reenviar» a la Tierra).
 * - Nunca bloquea la interfaz: si IndexedDB o Web Crypto no existen, se queda en memoria.
 */

export type EventKind =
  | "help_prompt"
  | "help_answer_ok"
  | "help_requested"
  | "help_auto_sent"
  | "help_acknowledged"
  | "protocol_started"
  | "protocol_step_done"
  | "protocol_finished";

export interface LoggedEvent {
  kind: EventKind;
  at: number;
  data: Record<string, unknown>;
}

interface StoredEvent {
  id?: number;
  at: number;
  sealed: Sealed;
}

interface StoredVault extends VaultRecord {
  id: "primary";
}

class LocalDb extends Dexie {
  events!: EntityTable<StoredEvent, "id">;
  vault!: EntityTable<StoredVault, "id">;
  constructor() {
    super("aegis_local_db");
    this.version(1).stores({ events: "++id, at", keys: "id" });
    // v2: la clave ya no se guarda; los eventos de v1 (cifrados con la clave de dispositivo) se descartan.
    this.version(2)
      .stores({ events: "++id, at", keys: null, vault: "id" })
      .upgrade((tx) => tx.table("events").clear());
  }
}

export type VaultStatus = "checking" | "unsupported" | "new" | "locked" | "unlocked";

interface VaultState {
  status: VaultStatus;
  /** Eventos esperando a que se desbloquee el registro (solo en memoria). */
  pending: number;
  busy: boolean;
  error: "wrong_pin" | "invalid_pin" | "failed" | null;
}

export const useVaultStore = create<VaultState>(() => ({ status: "checking", pending: 0, busy: false, error: null }));

const hasIdb = () => typeof indexedDB !== "undefined";
const hasCrypto = () => typeof crypto !== "undefined" && !!crypto.subtle;

let db: LocalDb | null = null;
let dataKey: CryptoKey | null = null;
const memory: LoggedEvent[] = [];

function getDb(): LocalDb | null {
  if (!hasIdb()) return null;
  db ??= new LocalDb();
  return db;
}

const setVault = (patch: Partial<VaultState>) => useVaultStore.setState(patch);

/** Comprueba si ya existe un registro con PIN. Se llama una vez al arrancar. */
export async function initVault(): Promise<void> {
  const store = getDb();
  if (!store || !hasCrypto()) {
    setVault({ status: "unsupported" });
    return;
  }
  try {
    const record = await store.vault.get("primary");
    setVault({ status: record ? "locked" : "new" });
  } catch {
    setVault({ status: "unsupported" });
  }
}

async function persist(store: LocalDb, key: CryptoKey, event: LoggedEvent): Promise<void> {
  await store.events.add({ at: event.at, sealed: await seal(key, event, PURPOSE.events) });
}

async function flushMemory(): Promise<void> {
  const store = getDb();
  if (!store || !dataKey) return;
  while (memory.length) {
    const event = memory[0];
    await persist(store, dataKey, event);
    memory.shift();
  }
  setVault({ pending: 0 });
}

/** Primera vez: crea el registro cifrado con un PIN nuevo. */
export async function createPin(pin: string): Promise<boolean> {
  const store = getDb();
  if (!store) return false;
  setVault({ busy: true, error: null });
  try {
    const { record, dataKey: key } = await createVault(pin);
    await store.vault.put({ id: "primary", ...record });
    dataKey = key;
    await flushMemory();
    setVault({ status: "unlocked", busy: false });
    return true;
  } catch (e) {
    setVault({ busy: false, error: e instanceof Error && e.message === "invalid_pin" ? "invalid_pin" : "failed" });
    return false;
  }
}

/** Abre el registro con el PIN. */
export async function unlockWithPin(pin: string): Promise<boolean> {
  const store = getDb();
  if (!store) return false;
  setVault({ busy: true, error: null });
  try {
    const record = await store.vault.get("primary");
    if (!record) throw new Error("missing");
    dataKey = await openVault(pin, record);
    await flushMemory();
    setVault({ status: "unlocked", busy: false });
    return true;
  } catch (e) {
    setVault({ busy: false, error: e instanceof WrongPinError ? "wrong_pin" : "failed" });
    return false;
  }
}

/** Cierra el registro: la clave sale de memoria. */
export function lockVault(): void {
  dataKey = null;
  if (useVaultStore.getState().status === "unlocked") setVault({ status: "locked" });
}

/** Olvidé el PIN: borra el registro local cifrado (no se puede recuperar sin el PIN). */
export async function resetVault(): Promise<void> {
  const store = getDb();
  dataKey = null;
  if (store) await store.transaction("rw", store.events, store.vault, async () => {
    await store.events.clear();
    await store.vault.clear();
  });
  setVault({ status: store ? "new" : "unsupported", error: null });
}

/** Nivel con el que el evento viaja en alerts_log hacia la Tierra. */
const EARTH_LEVEL: Partial<Record<EventKind, "info" | "caution" | "warning" | "critical">> = {
  help_prompt: "caution",
  help_answer_ok: "info",
  help_requested: "warning",
  help_auto_sent: "critical",
  help_acknowledged: "info",
};

export async function logEvent(kind: EventKind, data: Record<string, unknown> = {}): Promise<void> {
  const event: LoggedEvent = { kind, at: Date.now(), data };
  try {
    const store = getDb();
    if (store && dataKey) await persist(store, dataKey, event);
    else {
      memory.push(event);
      setVault({ pending: memory.length });
    }
  } catch {
    memory.push(event);
    setVault({ pending: memory.length });
  }

  // Copia hacia la Tierra (no bloquea; la bandeja la envía cuando haya enlace).
  try {
    const level = EARTH_LEVEL[kind];
    if (level) {
      await enqueueOutboxItem("alerts_log", {
        alert_id: String(data.alert_id ?? data.call_id ?? kind),
        level,
        title: kind,
        description: JSON.stringify(data),
        timestamp: new Date(event.at).toISOString(),
      });
    }
  } catch {
    /* la bandeja de salida es opcional: el registro local ya está guardado */
  }
}

/** Últimos eventos, del más reciente al más antiguo. Con el registro bloqueado, solo los de memoria. */
export async function readEvents(limit = 50): Promise<LoggedEvent[]> {
  const out: LoggedEvent[] = [...memory];
  try {
    const store = getDb();
    if (store && dataKey) {
      const rows = await store.events.orderBy("at").reverse().limit(limit).toArray();
      for (const row of rows) {
        try {
          out.push(await unseal<LoggedEvent>(dataKey, row.sealed, PURPOSE.events));
        } catch {
          /* registro dañado o de otra clave: se ignora sin romper la app */
        }
      }
    }
  } catch {
    /* sin base de datos: solo memoria */
  }
  return out.sort((a, b) => b.at - a.at).slice(0, limit);
}
