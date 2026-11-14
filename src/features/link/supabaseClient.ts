import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Variables de entorno inyectadas por Vite
const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isConfigured = Boolean(
  rawUrl &&
    typeof rawUrl === "string" &&
    rawUrl.trim() !== "" &&
    rawKey &&
    typeof rawKey === "string" &&
    rawKey.trim() !== "",
);

let clientInstance: SupabaseClient | null = null;

if (isConfigured) {
  try {
    clientInstance = createClient(rawUrl as string, rawKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      global: {
        headers: {
          "x-aegis-client": "aegis-space-med-ares01",
        },
      },
    });
  } catch (err) {
    console.warn("[EarthLink] Error al inicializar cliente Supabase:", err);
    clientInstance = null;
  }
}

/**
 * Retorna true si las credenciales de Supabase están configuradas en el entorno.
 */
export function isSupabaseConfigured(): boolean {
  return isConfigured && clientInstance !== null;
}

/**
 * Retorna la instancia de SupabaseClient o null si no está configurado.
 */
export function getSupabase(): SupabaseClient | null {
  return clientInstance;
}

export interface EarthLinkStatus {
  online: boolean;
  configured: boolean;
  latencyMs?: number;
  lastChecked: string;
  error?: string;
}

/**
 * Verifica la disponibilidad real de conexión con la Tierra (servidores de Supabase).
 * No bloquea la ejecución y degrada elegantemente si no hay red o no está configurado.
 */
export async function checkEarthLink(timeoutMs = 4000): Promise<EarthLinkStatus> {
  const now = new Date().toISOString();

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return {
      online: false,
      configured: isSupabaseConfigured(),
      lastChecked: now,
      error: "Modo avión / Sin conexión a red local",
    };
  }

  if (!isSupabaseConfigured() || !clientInstance) {
    return {
      online: false,
      configured: false,
      lastChecked: now,
      error: "Supabase no configurado (Variables VITE_SUPABASE_* no definidas)",
    };
  }

  const start = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Consulta ligera a ground_notes con timeout
    const { error } = await clientInstance
      .from("ground_notes")
      .select("id")
      .limit(1)
      .abortSignal(controller.signal);

    clearTimeout(timeoutId);

    if (error) {
      return {
        online: false,
        configured: true,
        latencyMs: Math.round(performance.now() - start),
        lastChecked: now,
        error: error.message,
      };
    }

    return {
      online: true,
      configured: true,
      latencyMs: Math.round(performance.now() - start),
      lastChecked: now,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : String(err);
    return {
      online: false,
      configured: true,
      latencyMs: Math.round(performance.now() - start),
      lastChecked: now,
      error: msg.includes("aborted") ? "Timeout de comunicación con la Tierra (>4s)" : msg,
    };
  }
}
