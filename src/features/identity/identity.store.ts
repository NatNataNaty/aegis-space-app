import { create } from "zustand";
import { CREW, crewById, useCrewStore } from "../../data/crew";
import { useHealthStore } from "../../stores/health.store";
import { useBaselineStore } from "../baseline/personalBaseline";
import { ocularSession } from "../camera/ocularSession";
import { deleteSecret, isVaultOpen, loadSecret, saveSecret } from "../protocols/eventLog";
import { averageSignature, signatureFrom, similarity } from "./faceSignature";

/**
 * Identificación facial automática de la tripulación (demo).
 *
 * Con la cámara activa, aegis vigila si aparece un rostro:
 *  1. Promedia ~15 fotogramas y lo compara con las huellas de toda la tripulación.
 *  2. Si se parece a alguien → abre su perfil y sus datos.
 *  3. Si es un rostro nuevo → lo registra como el siguiente tripulante sin huella (se puede corregir).
 *  4. Si la persona se va unos segundos → el perfil se vuelve a bloquear y espera al siguiente rostro.
 *
 * La huella (distancias entre puntos de la cara) se guarda CIFRADA con el PIN; sin PIN vive solo en
 * memoria. Nunca se guardan fotos ni vídeo y nunca se envía a la Tierra.
 */

const AUTO_FRAMES = 15;
/** Sin rostro durante este tiempo, el perfil se vuelve a bloquear. */
const ABSENT_MS = 3_000;
/** Parecido mínimo para considerar que es el mismo tripulante. */
export const CREW_MATCH = 0.6;

const key = (crewId: string) => `face-template:${crewId}`;
const LEGACY_KEY = "face-template";

export type IdentityPhase = "off" | "watching" | "identifying" | "matched" | "newcrew" | "unknown";

interface IdentityState {
  phase: IdentityPhase;
  progress: number;
  score: number | null;
  matchedId: string | null;
  enrolledIds: string[];
  lastMatchAt: number | null;
  refresh: () => Promise<void>;
  startAuto: () => void;
  stopAuto: () => void;
  /** «¿No eres tú?»: asigna el rostro actual a otro tripulante. */
  reassign: (crewId: string) => Promise<void>;
  forgetAll: () => Promise<void>;
}

const memory = new Map<string, number[]>();
let unsubscribe: (() => void) | null = null;
let samples: number[][] = [];
let lastFaceAt = 0;
let lastSignature: number[] | null = null;
let busy = false;

async function readTemplate(crewId: string): Promise<number[] | null> {
  const saved = (await loadSecret<number[]>(key(crewId))) ?? memory.get(crewId) ?? null;
  if (saved) return saved;
  // Huella de la versión anterior (una sola persona): pertenece a la tripulante por defecto.
  return crewId === "AR1-002" ? ((await loadSecret<number[]>(LEGACY_KEY)) ?? null) : null;
}

async function writeTemplate(crewId: string, sig: number[]): Promise<void> {
  memory.set(crewId, sig);
  if (isVaultOpen()) await saveSecret(key(crewId), sig);
}

async function removeTemplate(crewId: string): Promise<void> {
  memory.delete(crewId);
  await deleteSecret(key(crewId));
  if (crewId === "AR1-002") await deleteSecret(LEGACY_KEY);
}

/** Mejor coincidencia entre una huella y las de la tripulación. Función pura (se prueba sin cámara). */
export function bestCrewMatch(sig: number[], templates: Record<string, number[]>): { id: string; score: number } | null {
  let best: { id: string; score: number } | null = null;
  for (const [id, tpl] of Object.entries(templates)) {
    const score = similarity(sig, tpl);
    if (!best || score > best.score) best = { id, score };
  }
  return best;
}

/** Pone en pantalla al tripulante reconocido: su perfil y su escenario simulado. */
function activate(crewId: string) {
  const crew = crewById(crewId);
  if (!crew) return;
  const changed = useCrewStore.getState().activeId !== crewId;
  useCrewStore.getState().setActive(crewId);
  if (changed) {
    useBaselineStore.getState().reset();
    useHealthStore.getState().setScenario(crew.scenarioId);
  }
}

export const useIdentityStore = create<IdentityState>((set, get) => {
  async function allTemplates(): Promise<Record<string, number[]>> {
    const out: Record<string, number[]> = {};
    for (const c of CREW) {
      const t = await readTemplate(c.id);
      if (t) out[c.id] = t;
    }
    return out;
  }

  async function identify(sig: number[]) {
    busy = true;
    try {
      lastSignature = sig;
      const templates = await allTemplates();
      const best = bestCrewMatch(sig, templates);
      if (best && best.score >= CREW_MATCH) {
        activate(best.id);
        set({ phase: "matched", matchedId: best.id, score: best.score, progress: 1, lastMatchAt: Date.now() });
        return;
      }
      const free = CREW.find((c) => !templates[c.id]);
      if (!free) {
        set({ phase: "unknown", matchedId: null, score: best?.score ?? null, progress: 0 });
        return;
      }
      await writeTemplate(free.id, sig);
      activate(free.id);
      set({
        phase: "newcrew",
        matchedId: free.id,
        score: 1,
        progress: 1,
        lastMatchAt: Date.now(),
        enrolledIds: [...Object.keys(templates), free.id],
      });
    } finally {
      busy = false;
    }
  }

  return {
    phase: "off",
    progress: 0,
    score: null,
    matchedId: null,
    enrolledIds: [],
    lastMatchAt: null,

    refresh: async () => {
      set({ enrolledIds: Object.keys(await allTemplates()) });
    },

    startAuto: () => {
      if (unsubscribe) return;
      samples = [];
      lastFaceAt = Date.now();
      set({ phase: "watching", progress: 0 });
      void get().refresh();
      unsubscribe = ocularSession.onLandmarks((landmarks) => {
        const now = Date.now();
        const sig = signatureFrom(landmarks);
        const st = get();
        if (!sig) {
          if (now - lastFaceAt > ABSENT_MS && st.phase !== "watching") {
            samples = [];
            set({ phase: "watching", matchedId: null, progress: 0, score: null });
          }
          return;
        }
        lastFaceAt = now;
        if (busy || st.phase === "matched" || st.phase === "newcrew" || st.phase === "unknown") return;
        samples.push(sig);
        set({ phase: "identifying", progress: samples.length / AUTO_FRAMES });
        if (samples.length >= AUTO_FRAMES) {
          const avg = averageSignature(samples);
          samples = [];
          if (avg) void identify(avg);
        }
      });
    },

    stopAuto: () => {
      unsubscribe?.();
      unsubscribe = null;
      samples = [];
      set({ phase: "off", progress: 0, matchedId: null });
    },

    reassign: async (crewId) => {
      const from = get().matchedId;
      if (!lastSignature || !crewById(crewId) || from === crewId) return;
      if (from) await removeTemplate(from);
      await writeTemplate(crewId, lastSignature);
      activate(crewId);
      set({ phase: "matched", matchedId: crewId, score: 1, lastMatchAt: Date.now() });
      await get().refresh();
    },

    forgetAll: async () => {
      for (const c of CREW) await removeTemplate(c.id);
      lastSignature = null;
      samples = [];
      set({ enrolledIds: [], matchedId: null, score: null, lastMatchAt: null, phase: unsubscribe ? "watching" : "off" });
    },
  };
});
