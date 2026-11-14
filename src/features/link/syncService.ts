import { z } from "zod";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "./supabaseClient";
import {
  outboxDb,
  getPendingOutboxItems,
  getOutboxStats,
  enqueueOutboxItem,
  type OutboxTargetTable,
} from "./outboxService";
import { useLinkStore, type GroundNote } from "../../stores/linkStore";

// ==============================================================================
// 1. Esquemas de Validación Zod para Payloads hacia la Tierra
// ==============================================================================

export const crewTelemetryPayloadSchema = z.object({
  mission_id: z.string().default("ARES-01"),
  crew_id: z.string().min(1, "crew_id es obligatorio"),
  timestamp: z.string().optional().default(() => new Date().toISOString()),
  heart_rate: z.number().nullable().optional(),
  spo2: z.number().nullable().optional(),
  perclos: z.number().nullable().optional(),
  ear: z.number().nullable().optional(),
  radiation_dose: z.number().nullable().optional(),
  raw_data: z.record(z.string(), z.unknown()).optional().default({}),
});

export const alertsLogPayloadSchema = z.object({
  mission_id: z.string().default("ARES-01"),
  alert_id: z.string().min(1, "alert_id es obligatorio"),
  crew_id: z.string().nullable().optional(),
  level: z.enum(["info", "caution", "warning", "critical"]),
  title: z.string().min(1, "title es obligatorio"),
  description: z.string().nullable().optional(),
  timestamp: z.string().optional().default(() => new Date().toISOString()),
  acknowledged: z.boolean().optional().default(false),
});

export const protocolRunsPayloadSchema = z.object({
  mission_id: z.string().default("ARES-01"),
  protocol_id: z.string().min(1, "protocol_id es obligatorio"),
  protocol_title: z.string().min(1, "protocol_title es obligatorio"),
  crew_id: z.string().min(1, "crew_id es obligatorio"),
  operator_id: z.string().nullable().optional(),
  status: z.enum(["started", "in_progress", "completed", "aborted"]).default("completed"),
  review_status: z.enum(["pendiente", "revisado"]).default("pendiente"),
  steps_data: z.array(z.unknown()).optional().default([]),
  outcome: z.string().nullable().optional(),
  started_at: z.string().optional().default(() => new Date().toISOString()),
  completed_at: z.string().nullable().optional(),
});

export const groundNotePayloadSchema = z.object({
  mission_id: z.string().default("ARES-01"),
  author_role: z.string().min(1, "author_role es obligatorio"),
  title: z.string().min(1, "title es obligatorio"),
  note: z.string().min(1, "note es obligatorio"),
  priority: z.enum(["low", "normal", "urgent", "emergency"]).default("normal"),
  created_at: z.string().optional().default(() => new Date().toISOString()),
});

export type CrewTelemetryPayload = z.infer<typeof crewTelemetryPayloadSchema>;
export type AlertsLogPayload = z.infer<typeof alertsLogPayloadSchema>;
export type ProtocolRunsPayload = z.infer<typeof protocolRunsPayloadSchema>;
export type GroundNotePayload = z.infer<typeof groundNotePayloadSchema>;

/**
 * Valida un payload con su esquema Zod correspondiente.
 */
export function validatePayload(
  targetTable: OutboxTargetTable,
  payload: Record<string, unknown>,
): { success: true; data: Record<string, unknown> } | { success: false; error: string } {
  try {
    switch (targetTable) {
      case "crew_telemetry": {
        const data = crewTelemetryPayloadSchema.parse(payload);
        return { success: true, data: data as Record<string, unknown> };
      }
      case "alerts_log": {
        const data = alertsLogPayloadSchema.parse(payload);
        return { success: true, data: data as Record<string, unknown> };
      }
      case "protocol_runs": {
        const data = protocolRunsPayloadSchema.parse(payload);
        return { success: true, data: data as Record<string, unknown> };
      }
      case "ground_notes": {
        const data = groundNotePayloadSchema.parse(payload);
        return { success: true, data: data as Record<string, unknown> };
      }
      default:
        return { success: false, error: `Tabla desconocida: ${targetTable}` };
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issues = err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      return { success: false, error: issues };
    }
    return { success: false, error: String(err) };
  }
}

// ==============================================================================
// 2. Simulador de Retardo de Propagación Espacial (Tierra <-> Nave)
// ==============================================================================

/**
 * Simula el retardo físico de propagación de ondas de radio sin bloquear el hilo de la UI.
 */
export async function simulateTransmissionDelay(delayMs: number): Promise<void> {
  if (delayMs <= 0) return;
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

// ==============================================================================
// 3. Envío en Lote hacia Supabase respetando delayMode y linkStore
// ==============================================================================

let isBatchSyncRunning = false;

export async function syncOutboxBatch(batchSize = 25): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const store = useLinkStore.getState();

  // Si el enlace con la Tierra está inactivo manualmente (ej. modo silencio o zona de sombra)
  if (!store.isLinkActive) {
    const stats = await getOutboxStats();
    store.setPendingCount(stats.pending + stats.failed);
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  if (isBatchSyncRunning) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const stats = await getOutboxStats();
    store.setPendingCount(stats.pending + stats.failed);
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured()) {
    const stats = await getOutboxStats();
    store.setPendingCount(stats.pending + stats.failed);
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  isBatchSyncRunning = true;
  store.setIsSyncing(true);

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  try {
    const pendingItems = await getPendingOutboxItems(batchSize);
    processed = pendingItems.length;

    if (processed === 0) {
      store.setPendingCount(0);
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    // Aplicar simulación de retardo configurado (Luna 3s, Marte 15s, etc.)
    const delay = store.getDelayMs();
    if (delay > 0) {
      await simulateTransmissionDelay(delay);
    }

    for (const item of pendingItems) {
      if (!item.id) continue;

      // Validación previa con Zod
      const validation = validatePayload(item.target_table, item.payload);
      if (!validation.success) {
        await outboxDb.outbox.update(item.id, {
          status: "failed",
          retry_count: item.retry_count + 1,
          last_error: `Validación Zod fallida: ${validation.error}`,
        });
        failed++;
        continue;
      }

      try {
        await outboxDb.outbox.update(item.id, { status: "syncing" });

        const { error } = await supabase
          .from(item.target_table)
          .insert(validation.data);

        if (error) {
          throw new Error(error.message);
        }

        await outboxDb.outbox.update(item.id, {
          status: "synced",
          last_error: undefined,
        });
        succeeded++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await outboxDb.outbox.update(item.id, {
          status: "failed",
          retry_count: item.retry_count + 1,
          last_error: msg,
        });
        failed++;
      }
    }

    const updatedStats = await getOutboxStats();
    store.setPendingCount(updatedStats.pending + updatedStats.failed);
    if (succeeded > 0) {
      store.setLastSyncAt(new Date().toISOString());
    }
  } finally {
    isBatchSyncRunning = false;
    store.setIsSyncing(false);
  }

  return { processed, succeeded, failed };
}

// ==============================================================================
// 4. Suscripción y Polling Seguro a Notas de Tierra (ground_notes)
// ==============================================================================

// Notas de respaldo SOLO para la demo sin enlace: sin contenido clínico ni operativo inventado.
const FALLBACK_GROUND_NOTES: GroundNote[] = [
  {
    id: "demo-note-1",
    mission_id: "ARES-01",
    author_role: "Centro de control (demo)",
    title: "Nota de demostración",
    note: "Ejemplo de cómo llega una observación de la Tierra en el siguiente contacto. No es una indicación real.",
    priority: "normal",
    created_at: new Date(Date.now() - 3600 * 4000).toISOString(),
  },
]

/**
 * Consulta las notas de Tierra más recientes desde Supabase (o fallback offline).
 */
export async function fetchGroundNotes(limit = 20): Promise<GroundNote[]> {
  const store = useLinkStore.getState();
  const supabase = getSupabase();

  if (!isSupabaseConfigured() || !supabase || (typeof navigator !== "undefined" && !navigator.onLine)) {
    if (store.groundNotes.length === 0) {
      store.setGroundNotes(FALLBACK_GROUND_NOTES);
    }
    return store.groundNotes.length > 0 ? store.groundNotes : FALLBACK_GROUND_NOTES;
  }

  try {
    const { data, error } = await supabase
      .from("ground_notes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data || data.length === 0) {
      if (store.groundNotes.length === 0) {
        store.setGroundNotes(FALLBACK_GROUND_NOTES);
      }
      return store.groundNotes.length > 0 ? store.groundNotes : FALLBACK_GROUND_NOTES;
    }

    const notes = data as GroundNote[];
    store.setGroundNotes(notes);
    return notes;
  } catch {
    return store.groundNotes.length > 0 ? store.groundNotes : FALLBACK_GROUND_NOTES;
  }
}

/**
 * Inicia suscripción en tiempo real y polling de notas de Tierra.
 */
export function startGroundNotesSubscription(): () => void {
  // Carga inicial
  void fetchGroundNotes();

  const supabase = getSupabase();
  let channel: RealtimeChannel | null = null;

  if (isSupabaseConfigured() && supabase) {
    try {
      channel = supabase
        .channel("ground-notes-changes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "ground_notes",
          },
          (payload) => {
            const newNote = payload.new as GroundNote;
            useLinkStore.getState().addGroundNote(newNote);
          },
        )
        .subscribe();
    } catch (err) {
      console.warn("[EarthLink] Error al suscribirse a ground_notes:", err);
    }
  }

  // Polling de respaldo cada 30 segundos
  const intervalId = setInterval(() => {
    if (useLinkStore.getState().isLinkActive) {
      void fetchGroundNotes();
    }
  }, 30000);

  return () => {
    clearInterval(intervalId);
    if (channel && supabase) {
      void supabase.removeChannel(channel);
    }
  };
}

// ==============================================================================
// 5. Funciones de Integración para Pantalla de Control (/control)
// ==============================================================================

export interface MissionOverview {
  /** null = no hay datos de la Tierra (sin enlace o sin configurar): nunca se inventan cifras. */
  telemetryCount: number | null;
  alertsCount: number | null;
  protocolsCount: number | null;
  notesCount: number;
  recentNotes: GroundNote[];
  isOnline: boolean;
  isConfigured: boolean;
  pendingOutboxCount: number;
}

/**
 * Recopila el resumen global de telemetría y eventos para la consola de control (/control).
 * Ofrece datos de respaldo elegantes si no hay conexión o no está configurado Supabase.
 */
export async function fetchMissionOverview(): Promise<MissionOverview> {
  const supabase = getSupabase();
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : false;
  const isConfigured = isSupabaseConfigured();

  const stats = await getOutboxStats();
  const pendingOutboxCount = stats.pending + stats.failed;

  if (!isConfigured || !supabase || !isOnline) {
    const notes = await fetchGroundNotes();
    return {
      telemetryCount: null,
      alertsCount: null,
      protocolsCount: null,
      notesCount: notes.length,
      recentNotes: notes,
      isOnline,
      isConfigured,
      pendingOutboxCount,
    };
  }

  try {
    const [tRes, aRes, pRes] = await Promise.all([
      supabase.from("crew_telemetry").select("id", { count: "exact", head: true }),
      supabase.from("alerts_log").select("id", { count: "exact", head: true }),
      supabase.from("protocol_runs").select("id", { count: "exact", head: true }),
    ]);

    const notes = await fetchGroundNotes();

    return {
      telemetryCount: tRes.count ?? null,
      alertsCount: aRes.count ?? null,
      protocolsCount: pRes.count ?? null,
      notesCount: notes.length,
      recentNotes: notes,
      isOnline,
      isConfigured,
      pendingOutboxCount,
    };
  } catch {
    const notes = await fetchGroundNotes();
    return {
      telemetryCount: null,
      alertsCount: null,
      protocolsCount: null,
      notesCount: notes.length,
      recentNotes: notes,
      isOnline,
      isConfigured,
      pendingOutboxCount,
    };
  }
}

/**
 * Envía una nota o directriz médica hacia/desde Tierra con validación Zod y outbox.
 */
export async function sendGroundNote(noteData: {
  title: string;
  note: string;
  author_role?: string;
  priority?: "low" | "normal" | "urgent" | "emergency";
}): Promise<{ success: boolean; id?: string | number; error?: string }> {
  const payload = {
    mission_id: "ARES-01",
    author_role: noteData.author_role ?? "Oficial Médico (A bordo)",
    title: noteData.title,
    note: noteData.note,
    priority: noteData.priority ?? "normal",
    created_at: new Date().toISOString(),
  };

  const validation = validatePayload("ground_notes", payload);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  try {
    // Se encola primero en Outbox local
    const outboxId = await enqueueOutboxItem("ground_notes", validation.data);

    // Se agrega inmediatamente al store local para retroalimentación instantánea
    useLinkStore.getState().addGroundNote({
      id: `outbox-${outboxId}`,
      ...validation.data,
    } as GroundNote);

    // Si hay enlace y está configurado, sincronizar respetando retardo
    const store = useLinkStore.getState();
    if (store.isLinkActive && isSupabaseConfigured() && (typeof navigator === "undefined" || navigator.onLine)) {
      void syncOutboxBatch();
    }

    return { success: true, id: outboxId };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}
