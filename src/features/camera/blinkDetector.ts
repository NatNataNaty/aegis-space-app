import type { BlinkEvent, BlinkKind, EyeState } from "./camera.types";
import { EYE_CONFIG } from "./eyeMetrics.config";

export interface BlinkDetectorConfig {
  closeThreshold: number;
  openThreshold: number;
  confirmFrames: number;
  maxInvalidGapMs: number;
  blinkMaxMs: number;
  prolongedMaxMs: number;
}

export interface BlinkSample {
  timestampMs: number;
  /** currentEAR / baselineEAR, or null when the frame is not valid. */
  normalizedEar: number | null;
}

export interface BlinkUpdate {
  state: EyeState;
  event: BlinkEvent | null;
  /** Start of the closure in progress, if any. */
  closedSince: number | null;
}

export function classifyClosure(
  durationMs: number,
  config: Pick<BlinkDetectorConfig, "blinkMaxMs" | "prolongedMaxMs"> = EYE_CONFIG,
): BlinkKind {
  if (durationMs < config.blinkMaxMs) return "blink";
  if (durationMs < config.prolongedMaxMs) return "prolonged_closure";
  return "long_closure";
}

/**
 * Hysteresis state machine:
 * open → closing (first frame below close threshold) → closed (confirmed)
 * closed → open after `confirmFrames` frames above the open threshold.
 * From unknown, the detector only re-arms after a confirmed open state,
 * so a face that reappears with closed eyes never produces a fake event.
 */
export class BlinkDetector {
  private state: EyeState = "unknown";
  private belowRun = 0;
  private aboveRun = 0;
  private firstBelowAt: number | null = null;
  private firstAboveAt: number | null = null;
  private closedSince: number | null = null;
  private lastValidAt: number | null = null;

  constructor(private readonly config: BlinkDetectorConfig = EYE_CONFIG) {}

  get currentState(): EyeState {
    return this.state;
  }

  reset(): void {
    this.state = "unknown";
    this.belowRun = 0;
    this.aboveRun = 0;
    this.firstBelowAt = null;
    this.firstAboveAt = null;
    this.closedSince = null;
    this.lastValidAt = null;
  }

  update(sample: BlinkSample): BlinkUpdate {
    const { timestampMs: t, normalizedEar: ear } = sample;
    const c = this.config;

    if (ear === null) {
      this.belowRun = 0;
      this.aboveRun = 0;
      this.firstBelowAt = null;
      this.firstAboveAt = null;
      if (this.lastValidAt === null || t - this.lastValidAt > c.maxInvalidGapMs) {
        this.state = "unknown";
        this.closedSince = null;
      }
      return this.result(null);
    }

    this.lastValidAt = t;

    if (ear < c.closeThreshold) {
      if (this.belowRun === 0) this.firstBelowAt = t;
      this.belowRun += 1;
      this.aboveRun = 0;
      this.firstAboveAt = null;
    } else if (ear > c.openThreshold) {
      if (this.aboveRun === 0) this.firstAboveAt = t;
      this.aboveRun += 1;
      this.belowRun = 0;
      this.firstBelowAt = null;
    } else {
      // Dead band between thresholds: keep the current state, break pending runs.
      this.belowRun = 0;
      this.aboveRun = 0;
      this.firstBelowAt = null;
      this.firstAboveAt = null;
    }

    let event: BlinkEvent | null = null;

    switch (this.state) {
      case "unknown":
        if (this.aboveRun >= c.confirmFrames) this.state = "open";
        break;
      case "open":
      case "closing":
        if (this.belowRun >= c.confirmFrames) {
          this.state = "closed";
          this.closedSince = this.firstBelowAt ?? t;
        } else {
          this.state = this.belowRun > 0 ? "closing" : "open";
        }
        break;
      case "closed":
        if (this.aboveRun >= c.confirmFrames && this.closedSince !== null) {
          const endedAt = this.firstAboveAt ?? t;
          const durationMs = Math.max(0, endedAt - this.closedSince);
          event = {
            startedAt: this.closedSince,
            endedAt,
            durationMs,
            kind: classifyClosure(durationMs, c),
          };
          this.state = "open";
          this.closedSince = null;
        }
        break;
    }

    return this.result(event);
  }

  private result(event: BlinkEvent | null): BlinkUpdate {
    return { state: this.state, event, closedSince: this.closedSince };
  }
}
