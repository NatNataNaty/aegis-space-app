import type { Point3 } from "./camera.types";

const MIN_CORNER_DISTANCE = 1e-4;

function dist(a: Point3, b: Point3): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
 * Returns null when landmarks are missing or the eye corners collapse.
 */
export function eyeAspectRatio(
  landmarks: readonly (Point3 | undefined)[] | null | undefined,
  indices: readonly number[],
): number | null {
  if (!landmarks || indices.length !== 6) return null;
  const pts = indices.map((i) => landmarks[i]);
  if (pts.some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;

  const [p1, p2, p3, p4, p5, p6] = pts as Point3[];
  const horizontal = dist(p1, p4);
  if (horizontal < MIN_CORNER_DISTANCE) return null;

  const ear = (dist(p2, p6) + dist(p3, p5)) / (2 * horizontal);
  return Number.isFinite(ear) ? ear : null;
}

export function averageEar(left: number | null, right: number | null): number | null {
  if (left !== null && right !== null) return (left + right) / 2;
  return left ?? right;
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
