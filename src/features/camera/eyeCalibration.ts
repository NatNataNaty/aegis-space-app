import type { CalibrationState } from "./camera.types";
import { median } from "./eyeAspectRatio";
import { EYE_CONFIG } from "./eyeMetrics.config";

const MESSAGES = {
  idle: "Calibración pendiente",
  open: "Mira a la cámara con los ojos abiertos de forma natural",
  lowBaseline: "Apertura insuficiente. Mantén los ojos abiertos y mejora la iluminación",
  blinks: "Parpadea tres veces de forma normal",
  ready: "Referencia personal calibrada",
  readyPartial: "Calibrado. No se confirmaron los tres parpadeos; recalibra si el conteo no responde",
} as const;

export function initialCalibration(): CalibrationState {
  return {
    phase: "idle",
    progress: 0,
    blinksDetected: 0,
    baselineEar: null,
    message: MESSAGES.idle,
    completedAt: null,
  };
}

/**
 * Two steps: collect `calibrationOpenMs` of valid open-eye frames and take the median EAR,
 * then ask for a few blinks to confirm the detector responds with that baseline.
 */
export class EyeCalibrator {
  private state: CalibrationState = initialCalibration();
  private samples: number[] = [];
  private validMs = 0;
  private lastTs: number | null = null;
  private blinkPhaseStart = 0;

  get current(): CalibrationState {
    return this.state;
  }

  start(): CalibrationState {
    this.samples = [];
    this.validMs = 0;
    this.lastTs = null;
    this.state = {
      ...initialCalibration(),
      phase: "collecting_open",
      message: MESSAGES.open,
    };
    return this.state;
  }

  reset(): void {
    this.samples = [];
    this.validMs = 0;
    this.lastTs = null;
    this.state = initialCalibration();
  }

  /** Feed a frame during the open-eye collection step. */
  addOpenSample(timestampMs: number, rawEar: number | null, usable: boolean): CalibrationState {
    if (this.state.phase !== "collecting_open") return this.state;

    const dt = this.lastTs === null ? 0 : timestampMs - this.lastTs;
    this.lastTs = timestampMs;

    if (rawEar === null || !usable) return this.state;

    this.samples.push(rawEar);
    if (dt > 0 && dt <= EYE_CONFIG.maxFrameDtMs) this.validMs += dt;

    const progress = Math.min(1, this.validMs / EYE_CONFIG.calibrationOpenMs);
    if (progress < 1 || this.samples.length < EYE_CONFIG.calibrationMinSamples) {
      this.state = { ...this.state, progress };
      return this.state;
    }

    const baseline = median(this.samples);
    if (baseline === null || baseline < EYE_CONFIG.calibrationMinBaseline) {
      this.samples = [];
      this.validMs = 0;
      this.state = { ...this.state, progress: 0, message: MESSAGES.lowBaseline };
      return this.state;
    }

    this.blinkPhaseStart = timestampMs;
    this.state = {
      ...this.state,
      phase: "blink_check",
      baselineEar: baseline,
      progress: 0,
      blinksDetected: 0,
      message: MESSAGES.blinks,
    };
    return this.state;
  }

  /** Feed time and detected blinks during the blink check step. */
  addBlinkCheck(timestampMs: number, blinkDetected: boolean): CalibrationState {
    if (this.state.phase !== "blink_check") return this.state;

    const blinks = this.state.blinksDetected + (blinkDetected ? 1 : 0);
    const target = EYE_CONFIG.calibrationBlinkTarget;
    const timedOut = timestampMs - this.blinkPhaseStart > EYE_CONFIG.calibrationBlinkTimeoutMs;

    if (blinks >= target || timedOut) {
      this.state = {
        ...this.state,
        phase: "ready",
        blinksDetected: blinks,
        progress: 1,
        message: blinks >= target ? MESSAGES.ready : MESSAGES.readyPartial,
        completedAt: timestampMs,
      };
    } else {
      this.state = { ...this.state, blinksDetected: blinks, progress: blinks / target };
    }
    return this.state;
  }

  skipBlinkCheck(timestampMs: number): CalibrationState {
    if (this.state.phase !== "blink_check") return this.state;
    this.state = {
      ...this.state,
      phase: "ready",
      progress: 1,
      message: MESSAGES.ready,
      completedAt: timestampMs,
    };
    return this.state;
  }
}
