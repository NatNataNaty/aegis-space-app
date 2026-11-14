import { describe, expect, it } from "vitest";
import { BlinkDetector, classifyClosure } from "../src/features/camera/blinkDetector";
import { EYE_CONFIG } from "../src/features/camera/eyeMetrics.config";
import { assessFps } from "../src/features/camera/ocularMetrics";

const FRAME = 50;

function run(detector: BlinkDetector, values: (number | null)[], start = 0) {
  return values.map((v, i) => detector.update({ timestampMs: start + i * FRAME, normalizedEar: v }));
}

const open = (n: number) => Array<number>(n).fill(1);
const closed = (n: number) => Array<number>(n).fill(0.3);

describe("BlinkDetector", () => {
  it("counts exactly one event for a closed-open sequence", () => {
    const d = new BlinkDetector();
    const out = run(d, [...open(4), ...closed(4), ...open(4)]);
    const events = out.filter((o) => o.event);
    expect(events).toHaveLength(1);
    expect(events[0].event!.durationMs).toBe(4 * FRAME);
    expect(events[0].event!.kind).toBe("blink");
  });

  it("hysteresis prevents oscillation with small variations", () => {
    const d = new BlinkDetector();
    const noisy = [1, 1, 1, 0.7, 0.75, 0.7, 0.76, 0.72, 0.74, 0.7, 1, 1];
    const out = run(d, noisy);
    expect(out.filter((o) => o.event)).toHaveLength(0);
    expect(out.every((o) => o.state !== "closed")).toBe(true);
  });

  it("a single noisy frame below threshold does not confirm a closure", () => {
    const d = new BlinkDetector();
    const out = run(d, [...open(3), 0.3, ...open(3)]);
    expect(out.filter((o) => o.event)).toHaveLength(0);
  });

  it("classifies event kind by configured duration", () => {
    expect(classifyClosure(150)).toBe("blink");
    expect(classifyClosure(EYE_CONFIG.blinkMaxMs)).toBe("prolonged_closure");
    expect(classifyClosure(EYE_CONFIG.prolongedMaxMs - 1)).toBe("prolonged_closure");
    expect(classifyClosure(EYE_CONFIG.prolongedMaxMs)).toBe("long_closure");
  });

  it("long closures are classified from real frame timing", () => {
    const d = new BlinkDetector();
    const out = run(d, [...open(3), ...closed(14), ...open(3)]);
    const ev = out.find((o) => o.event)!.event!;
    expect(ev.durationMs).toBe(14 * FRAME);
    expect(ev.kind).toBe("long_closure");
  });

  it("never turns unknown into closed and requires an open state to re-arm", () => {
    const d = new BlinkDetector();
    const out = run(d, [null, null, ...closed(6), ...open(3)]);
    expect(out.some((o) => o.state === "closed")).toBe(false);
    expect(out.filter((o) => o.event)).toHaveLength(0);
  });

  it("drops a closure when the face is lost for longer than the gap limit", () => {
    const d = new BlinkDetector();
    const gapFrames = Math.ceil(EYE_CONFIG.maxInvalidGapMs / FRAME) + 2;
    const out = run(d, [...open(3), ...closed(3), ...Array(gapFrames).fill(null), ...open(4)]);
    expect(out.filter((o) => o.event)).toHaveLength(0);
  });
});

describe("assessFps", () => {
  it("returns limited quality below the minimum FPS", () => {
    expect(assessFps(10)).toBe("limited");
    expect(assessFps(EYE_CONFIG.minFps)).toBe("good");
    expect(assessFps(20)).toBe("good");
  });
});
