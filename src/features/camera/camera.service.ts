import type { CameraErrorCode } from "./camera.types";

export const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: "user",
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 30 },
  },
};

export class CameraError extends Error {
  constructor(
    public readonly code: CameraErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export const CAMERA_ERROR_TEXT: Record<CameraErrorCode, string> = {
  denied: "Permiso de cámara denegado. Habilítalo en la configuración del navegador.",
  no_camera: "No se encontró ninguna cámara conectada.",
  in_use: "La cámara está en uso por otra aplicación.",
  insecure: "La cámara requiere un contexto seguro (localhost o HTTPS).",
  unsupported: "Este navegador no permite acceder a la cámara.",
  model: "No se pudo cargar el modelo local de visión.",
  unknown: "No se pudo iniciar la cámara.",
};

function mapError(err: unknown): CameraError {
  const name = err instanceof DOMException || err instanceof Error ? err.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return new CameraError("denied", CAMERA_ERROR_TEXT.denied);
    case "NotFoundError":
    case "OverconstrainedError":
      return new CameraError("no_camera", CAMERA_ERROR_TEXT.no_camera);
    case "NotReadableError":
    case "AbortError":
      return new CameraError("in_use", CAMERA_ERROR_TEXT.in_use);
    default:
      return new CameraError("unknown", CAMERA_ERROR_TEXT.unknown);
  }
}

export async function openCamera(): Promise<MediaStream> {
  if (!window.isSecureContext) throw new CameraError("insecure", CAMERA_ERROR_TEXT.insecure);
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new CameraError("unsupported", CAMERA_ERROR_TEXT.unsupported);
  }
  try {
    return await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
  } catch (err) {
    throw mapError(err);
  }
}

export async function attachStream(video: HTMLVideoElement, stream: MediaStream): Promise<void> {
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
    await new Promise<void>((resolve) => {
      video.addEventListener("loadedmetadata", () => resolve(), { once: true });
    });
  }
  await video.play();
}

export function stopStream(stream: MediaStream | null, video?: HTMLVideoElement | null): void {
  stream?.getTracks().forEach((track) => track.stop());
  if (video) {
    video.pause();
    video.srcObject = null;
  }
}
