import type { HeadPose } from "./camera.types";

const RAD_TO_DEG = 180 / Math.PI;

/**
 * Approximate Euler angles (degrees) from MediaPipe's 4x4 column-major facial
 * transformation matrix. Contextual only.
 */
export function headPoseFromMatrix(data: readonly number[] | null | undefined): HeadPose | null {
  if (!data || data.length < 16) return null;
  const r00 = data[0];
  const r10 = data[1];
  const r20 = data[2];
  const r21 = data[6];
  const r22 = data[10];

  const yaw = Math.asin(Math.max(-1, Math.min(1, -r20))) * RAD_TO_DEG;
  const pitch = Math.atan2(r21, r22) * RAD_TO_DEG;
  const roll = Math.atan2(r10, r00) * RAD_TO_DEG;

  if (![pitch, yaw, roll].every(Number.isFinite)) return null;
  return { pitch, yaw, roll };
}
