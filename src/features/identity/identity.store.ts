import { create } from "zustand";
import { ocularSession } from "../camera/ocularSession";
import { deleteSecret, isVaultOpen, loadSecret, saveSecret } from "../protocols/eventLog";
import { averageSignature, isMatch, signatureFrom, similarity } from "./faceSignature";

/**
 * Identificación facial de la demo.
 * - «Registrar mi rostro»: promedia ~30 fotogramas y guarda la huella CIFRADA con la clave del PIN.
 * - «Reconocer»: promedia ~20 fotogramas y los compara con la huella guardada.
 * La huella nunca sale del equipo ni se envía a la Tierra; nunca se guardan fotos ni vídeo.
 */

const SECRET_ID = "face-template";
const ENROLL_FRAMES = 30;
const SCAN_FRAMES = 20;
const TIMEOUT_MS = 15_000;

export type IdentityPhase = "idle" | "enrolling" | "scanning" | "matched" | "nomatch" | "noface" | "locked";

interface IdentityState {
  phase: IdentityPhase;
  progress: number;
  score: number | null;
  enrolled: boolean;
  lastMatchAt: number | null;
  refresh: () => Promise<void>;
  enroll: () => void;
  scan: () => void;
  stop: () => void;
  forget: () => Promise<void>;
}

let unsubscribe: (() => void) | null = null;
let timer: number | null = null;
let memoryTemplate: number[] | null = null;

function cleanup() {
  unsubscribe?.();
  unsubscribe = null;
  if (timer !== null) window.clearTimeout(timer);
  timer = null;
}

function collect(frames: number, onDone: (sig: number[]) => void, set: (p: Partial<IdentityState>) => void) {
  cleanup();
  const samples: number[][] = [];
  unsubscribe = ocularSession.onLandmarks((landmarks) => {
    const sig = signatureFrom(landmarks);
    if (!sig) return;
    samples.push(sig);
    set({ progress: samples.length / frames });
    if (samples.length >= frames) {
      cleanup();
      const avg = averageSignature(samples);
      if (avg) onDone(avg);
    }
  });
  timer = window.setTimeout(() => {
    cleanup();
    set({ phase: "noface", progress: 0 });
  }, TIMEOUT_MS);
}

async function readTemplate(): Promise<number[] | null> {
  return (await loadSecret<number[]>(SECRET_ID)) ?? memoryTemplate;
}

export const useIdentityStore = create<IdentityState>((set) => ({
  phase: "idle",
  progress: 0,
  score: null,
  enrolled: false,
  lastMatchAt: null,

  refresh: async () => {
    set({ enrolled: (await readTemplate()) !== null });
  },

  enroll: () => {
    if (!isVaultOpen()) {
      set({ phase: "locked" });
      return;
    }
    set({ phase: "enrolling", progress: 0, score: null });
    void ocularSession.start();
    collect(
      ENROLL_FRAMES,
      async (sig) => {
        const saved = await saveSecret(SECRET_ID, sig);
        if (!saved) memoryTemplate = sig;
        set({ phase: "matched", progress: 1, score: 1, enrolled: true, lastMatchAt: Date.now() });
      },
      set,
    );
  },

  scan: () => {
    set({ phase: "scanning", progress: 0, score: null });
    void ocularSession.start();
    collect(
      SCAN_FRAMES,
      async (sig) => {
        const template = await readTemplate();
        if (!template) {
          set({ phase: isVaultOpen() ? "idle" : "locked", enrolled: false, progress: 0 });
          return;
        }
        const score = similarity(sig, template);
        const ok = isMatch(sig, template);
        set({ phase: ok ? "matched" : "nomatch", score, progress: 1, lastMatchAt: ok ? Date.now() : null });
      },
      set,
    );
  },

  stop: () => {
    cleanup();
    set({ phase: "idle", progress: 0 });
  },

  forget: async () => {
    cleanup();
    memoryTemplate = null;
    await deleteSecret(SECRET_ID);
    set({ phase: "idle", enrolled: false, score: null, lastMatchAt: null, progress: 0 });
  },
}));
