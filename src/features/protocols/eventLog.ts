import Dexie, { type EntityTable } from "dexie";
import { enqueueOutboxItem } from "../link/outboxService";

/**
 * Registro local de lo que pasa a bordo (alertas respondidas, avisos, pasos de protocolo).
 *
 * - Cifrado en reposo con AES-GCM 256 (Web Crypto). La clave se genera en el dispositivo como
 *   NO extraíble y se guarda en IndexedDB: el contenido no se puede leer copiando la base de datos
 *   a otro equipo. Pendiente (P4): derivar la clave del PIN de cada tripulante (PBKDF2).
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
  iv: Uint8Array<ArrayBuffer>;
  cipher: ArrayBuffer;
}

interface StoredKey {
  id: string;
  key: CryptoKey;
}

class LocalDb extends Dexie {
  events!: EntityTable<StoredEvent, "id">;
  keys!: EntityTable<StoredKey, "id">;
  constructor() {
    super("aegis_local_db");
    this.version(1).stores({ events: "++id, at", keys: "id" });
  }
}

const hasIdb = () => typeof indexedDB !== "undefined";
const hasCrypto = () => typeof crypto !== "undefined" && !!crypto.subtle;

let db: LocalDb | null = null;
const memory: LoggedEvent[] = [];
let keyPromise: Promise<CryptoKey> | null = null;

function getDb(): LocalDb | null {
  if (!hasIdb()) return null;
  db ??= new LocalDb();
  return db;
}

async function deviceKey(store: LocalDb): Promise<CryptoKey> {
  keyPromise ??= (async () => {
    const saved = await store.keys.get("events");
    if (saved) return saved.key;
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    await store.keys.put({ id: "events", key });
    return key;
  })();
  return keyPromise;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

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
    if (store && hasCrypto()) {
      const key = await deviceKey(store);
      const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
      const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(event)));
      await store.events.add({ at: event.at, iv, cipher });
    } else {
      memory.push(event);
    }
  } catch {
    memory.push(event);
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

/** Últimos eventos descifrados, del más reciente al más antiguo. */
export async function readEvents(limit = 50): Promise<LoggedEvent[]> {
  const out: LoggedEvent[] = [...memory];
  try {
    const store = getDb();
    if (store && hasCrypto()) {
      const key = await deviceKey(store);
      const rows = await store.events.orderBy("at").reverse().limit(limit).toArray();
      for (const row of rows) {
        try {
          const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: row.iv }, key, row.cipher);
          out.push(JSON.parse(dec.decode(plain)) as LoggedEvent);
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
