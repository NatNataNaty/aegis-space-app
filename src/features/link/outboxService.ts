import Dexie, { type EntityTable } from "dexie";
import { getSupabase, isSupabaseConfigured } from "./supabaseClient";

export type OutboxTargetTable =
  | "crew_telemetry"
  | "alerts_log"
  | "protocol_runs"
  | "ground_notes";

export interface OutboxItem {
  id?: number;
  target_table: OutboxTargetTable;
  payload: Record<string, unknown>;
  created_at: string;
  status: "pending" | "syncing" | "failed" | "synced";
  retry_count: number;
  last_error?: string;
}

class AegisOutboxDatabase extends Dexie {
  outbox!: EntityTable<OutboxItem, "id">;

  constructor() {
    super("aegis_outbox_db");
    this.version(1).stores({
      outbox: "++id, target_table, status, created_at, retry_count",
    });
  }
}

export const outboxDb = new AegisOutboxDatabase();

function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

/**
 * Encola un evento o registro en la base de datos local de salida (IndexedDB).
 * Permite que cualquier módulo registre telemetría, alertas o protocolos sin conexión.
 */
export async function enqueueOutboxItem(
  target_table: OutboxTargetTable,
  payload: Record<string, unknown>,
): Promise<number> {
  if (!isIndexedDBAvailable()) {
    return 1;
  }

  const item: OutboxItem = {
    target_table,
    payload,
    created_at: new Date().toISOString(),
    status: "pending",
    retry_count: 0,
  };

  const id = await outboxDb.outbox.add(item);

  // Si hay red y Supabase está listo, intentar sincronización en segundo plano
  if (typeof navigator !== "undefined" && navigator.onLine && isSupabaseConfigured()) {
    void flushOutbox();
  }

  return Number(id);
}

/**
 * Obtiene las estadísticas de la cola de salida local.
 */
export async function getOutboxStats(): Promise<{
  pending: number;
  failed: number;
  synced: number;
  total: number;
}> {
  if (!isIndexedDBAvailable()) {
    return { pending: 0, failed: 0, synced: 0, total: 0 };
  }

  const [pending, failed, synced, total] = await Promise.all([
    outboxDb.outbox.where("status").equals("pending").count(),
    outboxDb.outbox.where("status").equals("failed").count(),
    outboxDb.outbox.where("status").equals("synced").count(),
    outboxDb.outbox.count(),
  ]);

  return { pending, failed, synced, total };
}

/**
 * Obtiene los elementos pendientes o fallidos listos para reintento.
 */
export async function getPendingOutboxItems(limit = 50): Promise<OutboxItem[]> {
  if (!isIndexedDBAvailable()) {
    return [];
  }

  return outboxDb.outbox
    .where("status")
    .anyOf(["pending", "failed"])
    .and((item) => item.retry_count < 5)
    .limit(limit)
    .toArray();
}

let isFlushing = false;

/**
 * Procesa la cola de salida y reenvía los datos pendientes a la base de datos de Tierra (Supabase).
 * Garantiza idempotencia y no bloquea en caso de fallo de red.
 */
export async function flushOutbox(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  if (isFlushing) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured()) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  isFlushing = true;
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  try {
    const items = await getPendingOutboxItems(25);
    processed = items.length;

    for (const item of items) {
      if (!item.id) continue;

      try {
        await outboxDb.outbox.update(item.id, { status: "syncing" });

        const { error } = await supabase
          .from(item.target_table)
          .insert(item.payload);

        if (error) {
          throw new Error(error.message);
        }

        // Marcar como sincronizado
        await outboxDb.outbox.update(item.id, {
          status: "synced",
          last_error: undefined,
        });
        succeeded++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        await outboxDb.outbox.update(item.id, {
          status: "failed",
          retry_count: item.retry_count + 1,
          last_error: errorMsg,
        });
        failed++;
      }
    }
  } finally {
    isFlushing = false;
  }

  return { processed, succeeded, failed };
}

/**
 * Limpia eventos antiguos ya sincronizados de la base de datos local para ahorrar espacio.
 */
export async function pruneSyncedItems(maxAgeHours = 48): Promise<number> {
  const threshold = new Date(Date.now() - maxAgeHours * 3600 * 1000).toISOString();
  const toDelete = await outboxDb.outbox
    .where("status")
    .equals("synced")
    .and((item) => item.created_at < threshold)
    .primaryKeys();

  await outboxDb.outbox.bulkDelete(toDelete);
  return toDelete.length;
}

/**
 * Inicializa los listeners automáticos para vaciar la cola cuando se restablece la conexión.
 */
export function initOutboxAutoSync(): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleOnline = () => {
    console.info("[EarthLink] Conexión restablecida. Iniciando vaciado de Outbox...");
    void flushOutbox();
  };

  window.addEventListener("online", handleOnline);

  // Intentar sincronización inicial si ya está online
  if (navigator.onLine && isSupabaseConfigured()) {
    void flushOutbox();
  }

  return () => {
    window.removeEventListener("online", handleOnline);
  };
}
