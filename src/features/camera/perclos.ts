import { EYE_CONFIG } from "./eyeMetrics.config";

export interface PerclosSample {
  timestampMs: number;
  /** Time credited to this frame. 0 for frames after a gap. */
  dtMs: number;
  valid: boolean;
  nearlyClosed: boolean;
}

export interface PerclosConfig {
  minRunMs: number;
  minValidMs: number;
  minCoverage: number;
}

export interface PerclosResult {
  perclos: number | null;
  validMs: number;
  closedMs: number;
  validCoverage: number;
}

/**
 * Percentage of valid time with eyes nearly closed inside [now - windowMs, now].
 * Runs of nearly-closed frames shorter than `minRunMs` (ordinary blinks) are excluded.
 * Invalid frames are excluded from numerator and denominator.
 */
export function computePerclos(
  samples: readonly PerclosSample[],
  nowMs: number,
  windowMs: number,
  config: PerclosConfig,
  sessionStartMs?: number,
): PerclosResult {
  const from = nowMs - windowMs;
  let validMs = 0;
  let closedMs = 0;

  let runMs = 0;

  const closeRun = () => {
    if (runMs >= config.minRunMs) closedMs += runMs;
    runMs = 0;
  };

  for (const s of samples) {
    if (s.timestampMs <= from || s.timestampMs > nowMs) continue;
    if (!s.valid) {
      closeRun();
      continue;
    }
    validMs += s.dtMs;
    if (s.nearlyClosed) runMs += s.dtMs;
    else closeRun();
  }
  closeRun();

  const span = sessionStartMs !== undefined ? Math.min(windowMs, nowMs - sessionStartMs) : windowMs;
  const validCoverage = span > 0 ? Math.min(1, validMs / span) : 0;
  const enough = validMs >= config.minValidMs && validCoverage >= config.minCoverage;

  return {
    perclos: enough && validMs > 0 ? (closedMs / validMs) * 100 : null,
    validMs,
    closedMs,
    validCoverage,
  };
}

/** Rolling buffer that keeps only the last `retentionMs` of samples. */
export class PerclosBuffer {
  private samples: PerclosSample[] = [];
  private lastTs: number | null = null;

  constructor(
    private readonly retentionMs = 300_000,
    private readonly maxFrameDtMs: number = EYE_CONFIG.maxFrameDtMs,
  ) {}

  push(timestampMs: number, valid: boolean, nearlyClosed: boolean): void {
    const rawDt = this.lastTs === null ? 0 : timestampMs - this.lastTs;
    const dtMs = rawDt > 0 && rawDt <= this.maxFrameDtMs ? rawDt : 0;
    this.lastTs = timestampMs;
    this.samples.push({ timestampMs, dtMs, valid, nearlyClosed: valid && nearlyClosed });

    const cutoff = timestampMs - this.retentionMs;
    let drop = 0;
    while (drop < this.samples.length && this.samples[drop].timestampMs < cutoff) drop++;
    if (drop > 0) this.samples.splice(0, drop);
  }

  compute(nowMs: number, windowSec: 60 | 300, sessionStartMs?: number): PerclosResult {
    return computePerclos(
      this.samples,
      nowMs,
      windowSec * 1000,
      {
        minRunMs: EYE_CONFIG.perclosMinRunMs,
        minValidMs: EYE_CONFIG.perclosMinValidMs[windowSec],
        minCoverage: EYE_CONFIG.minCoverage,
      },
      sessionStartMs,
    );
  }

  clear(): void {
    this.samples = [];
    this.lastTs = null;
  }
}
