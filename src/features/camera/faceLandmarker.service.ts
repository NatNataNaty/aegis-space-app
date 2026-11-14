import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import type { Delegate } from "./camera.types";

const WASM_PATH = "/mediapipe/wasm";
const MODEL_PATH = "/models/face_landmarker.task";

interface LandmarkerHandle {
  landmarker: FaceLandmarker;
  delegate: Delegate;
}

let pending: Promise<LandmarkerHandle> | null = null;
let lastTimestamp = -1;

async function create(delegate: Delegate): Promise<FaceLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_PATH, delegate },
    runningMode: "VIDEO",
    numFaces: 1,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
  });
}

/** Loads the local WASM + model once and reuses the same instance for the whole app. */
export function getFaceLandmarker(): Promise<LandmarkerHandle> {
  if (!pending) {
    pending = (async () => {
      try {
        return { landmarker: await create("GPU"), delegate: "GPU" as const };
      } catch (gpuError) {
        console.warn("[FaceLandmarker] GPU no disponible, usando CPU", gpuError);
        return { landmarker: await create("CPU"), delegate: "CPU" as const };
      }
    })();
    pending.catch(() => {
      pending = null;
    });
  }
  return pending;
}

export function detectFrame(
  landmarker: FaceLandmarker,
  video: HTMLVideoElement,
  timestampMs: number,
): FaceLandmarkerResult | null {
  // MediaPipe requires strictly increasing timestamps in VIDEO mode.
  const ts = timestampMs <= lastTimestamp ? lastTimestamp + 1 : timestampMs;
  lastTimestamp = ts;
  try {
    return landmarker.detectForVideo(video, ts);
  } catch (err) {
    console.error("[FaceLandmarker] detectForVideo", err);
    return null;
  }
}
