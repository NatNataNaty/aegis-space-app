import type { EyeState, Point3 } from "./camera.types";
import { EYE_CONFIG } from "./eyeMetrics.config";

const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152,
  148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
];
const RIGHT_EYE_CONTOUR = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7];
const LEFT_EYE_CONTOUR = [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382];

const EYE_COLORS: Record<EyeState, string> = {
  open: "#3ddc97",
  closing: "#f5c451",
  closed: "#ff7a59",
  unknown: "#8a94a6",
};

function path(ctx: CanvasRenderingContext2D, lm: Point3[], idx: readonly number[], w: number, h: number) {
  ctx.beginPath();
  idx.forEach((i, n) => {
    const p = lm[i];
    if (!p) return;
    if (n === 0) ctx.moveTo(p.x * w, p.y * h);
    else ctx.lineTo(p.x * w, p.y * h);
  });
  ctx.closePath();
}

export function clearOverlay(canvas: HTMLCanvasElement | null): void {
  const ctx = canvas?.getContext("2d");
  if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export function drawOverlay(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  landmarks: Point3[] | null,
  eyeState: EyeState,
): void {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  if (!landmarks) return;

  ctx.lineWidth = Math.max(1, w / 480);
  ctx.strokeStyle = "rgba(120, 180, 255, 0.35)";
  path(ctx, landmarks, FACE_OVAL, w, h);
  ctx.stroke();

  ctx.lineWidth = Math.max(1.5, w / 320);
  ctx.strokeStyle = EYE_COLORS[eyeState];
  path(ctx, landmarks, RIGHT_EYE_CONTOUR, w, h);
  ctx.stroke();
  path(ctx, landmarks, LEFT_EYE_CONTOUR, w, h);
  ctx.stroke();

  ctx.fillStyle = EYE_COLORS[eyeState];
  const r = Math.max(1.5, w / 400);
  for (const i of [...EYE_CONFIG.rightEye, ...EYE_CONFIG.leftEye]) {
    const p = landmarks[i];
    if (!p) continue;
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
}
