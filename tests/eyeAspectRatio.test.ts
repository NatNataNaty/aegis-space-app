import { describe, expect, it } from "vitest";
import type { Point3 } from "../src/features/camera/camera.types";
import { averageEar, eyeAspectRatio, median } from "../src/features/camera/eyeAspectRatio";

const IDX = [0, 1, 2, 3, 4, 5];

/** Builds six eye points: corners at x=0 and x=1, lids separated by `opening`. */
function eye(opening: number): Point3[] {
  return [
    { x: 0, y: 0.5 },
    { x: 0.33, y: 0.5 - opening / 2 },
    { x: 0.66, y: 0.5 - opening / 2 },
    { x: 1, y: 0.5 },
    { x: 0.66, y: 0.5 + opening / 2 },
    { x: 0.33, y: 0.5 + opening / 2 },
  ];
}

describe("eyeAspectRatio", () => {
  it("returns a coherent value for open eyes and drops when closing", () => {
    const open = eyeAspectRatio(eye(0.3), IDX)!;
    const closed = eyeAspectRatio(eye(0.05), IDX)!;
    expect(open).toBeCloseTo(0.3, 5);
    expect(closed).toBeLessThan(open);
  });

  it("returns null when eye corners collapse", () => {
    const pts = eye(0.3);
    pts[3] = { ...pts[0] };
    expect(eyeAspectRatio(pts, IDX)).toBeNull();
  });

  it("returns null when landmarks are missing", () => {
    expect(eyeAspectRatio(null, IDX)).toBeNull();
    expect(eyeAspectRatio(eye(0.3).slice(0, 4), IDX)).toBeNull();
  });

  it("averages both eyes and falls back to the valid one", () => {
    expect(averageEar(0.2, 0.4)).toBeCloseTo(0.3);
    expect(averageEar(null, 0.4)).toBe(0.4);
    expect(averageEar(null, null)).toBeNull();
  });

  it("computes the median", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});
