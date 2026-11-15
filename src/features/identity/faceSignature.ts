import type { Point3 } from "../camera/camera.types";

/**
 * Huella geométrica del rostro para la identificación facial de la demo (P3/P5).
 *
 * - Usa los puntos de MediaPipe Face Landmarker que ya se calculan para los ojos: no carga otro modelo.
 * - La huella son distancias entre 18 puntos estables, divididas por la distancia entre los ojos:
 *   no depende de lo cerca que estés de la cámara. No es una foto ni se puede reconstruir la cara con ella.
 * - Nivel demo: sirve para distinguir a las personas de una tripulación pequeña en buenas condiciones,
 *   no como control de acceso seguro (el PIN sigue siendo la llave del registro).
 */

/** Esquinas de ojos, cejas, nariz, boca, mentón, frente y pómulos (índices del modelo de 478 puntos). */
export const SIGNATURE_POINTS = [33, 133, 362, 263, 70, 300, 105, 334, 1, 168, 61, 291, 0, 17, 152, 10, 234, 454] as const;

const LEFT_EYE_OUTER = 33;
const RIGHT_EYE_OUTER = 263;

const dist = (a: Point3, b: Point3) => Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));

/** Huella de un fotograma, o null si faltan puntos. */
export function signatureFrom(landmarks: Point3[] | null): number[] | null {
  if (!landmarks || landmarks.length < 468) return null;
  const scale = dist(landmarks[LEFT_EYE_OUTER], landmarks[RIGHT_EYE_OUTER]);
  if (!(scale > 1e-6)) return null;
  const pts = SIGNATURE_POINTS.map((i) => landmarks[i]);
  const out: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) out.push(dist(pts[i], pts[j]) / scale);
  }
  return out;
}

/** Media de varias huellas (un registro usa ~30 fotogramas para reducir el ruido). */
export function averageSignature(samples: number[][]): number[] | null {
  if (!samples.length) return null;
  const n = samples[0].length;
  const out = new Array<number>(n).fill(0);
  for (const s of samples) {
    if (s.length !== n) return null;
    for (let i = 0; i < n; i++) out[i] += s[i] / samples.length;
  }
  return out;
}

/**
 * Diferencia media, en unidades de «distancia entre los ojos», que se acepta como la misma persona.
 * Medirla en esa unidad (y no relativa a cada par) evita que los pares de puntos cercanos amplifiquen el ruido.
 */
export const MATCH_TOLERANCE = 0.035;
export const MATCH_THRESHOLD = 0.7;

/** Parecido entre 0 (nada) y 1 (idéntico). */
export function similarity(a: number[], b: number[]): number {
  if (a.length !== b.length || !a.length) return 0;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  const meanAbs = sum / a.length;
  return Math.max(0, Math.min(1, 1 - meanAbs / (MATCH_TOLERANCE / (1 - MATCH_THRESHOLD))));
}

export const isMatch = (a: number[], b: number[]) => similarity(a, b) >= MATCH_THRESHOLD;
