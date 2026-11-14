import type {
  BlinkEvent,
  CalibrationState,
  FaceObservation,
  OcularFrame,
  OcularSummary,
  Point3,
  Quality,
  YawnEvent,
} from "./camera.types";
import { BlinkDetector } from "./blinkDetector";
import { EyeCalibrator } from "./eyeCalibration";
import { eyeAspectRatio } from "./eyeAspectRatio";
import { EYE_CONFIG } from "./eyeMetrics.config";
import { headPoseFromMatrix } from "./headPose";
import { PerclosBuffer } from "./perclos";

const FACE_LEFT = 234;
const FACE_RIGHT = 454;
const NOSE_TIP = 1;
const MIN_LANDMARKS = 468;
const FPS_WARMUP_MS = 1500;
const MAX_FACE_JUMP = 0.08;
const RETENTION_MS = 300_000;

export interface AnalyzerOutput {
  frame: OcularFrame;
  calibration: CalibrationState;
  rawEar: number | null;
  closedSince: number | null;
  event: BlinkEvent | null;
  yawn: YawnEvent | null;
  calibrationJustCompleted: boolean;
}

export class FpsMeter {
  private stamps: number[] = [];

  tick(t: number): number {
    this.stamps.push(t);
    while (this.stamps.length && t - this.stamps[0] > 1000) this.stamps.shift();
    return this.stamps.length;
  }

  reset(): void {
    this.stamps = [];
  }
}

export function assessFps(fps: number, minFps: number = EYE_CONFIG.minFps): Quality {
  return fps < minFps ? "limited" : "good";
}

function cornerWidth(lm: Point3[], idx: readonly number[]): number {
  const a = lm[idx[0]];
  const b = lm[idx[3]];
  return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
}

function worst(a: Quality, b: Quality): Quality {
  if (a === "unavailable" || b === "unavailable") return "unavailable";
  if (a === "limited" || b === "limited") return "limited";
  return "good";
}

/**
 * Combines Face Landmarker observations into ocular frames, events and window summaries.
 * One instance per camera session; it holds no images, only derived numbers.
 */
export class OcularAnalyzer {
  private detector = new BlinkDetector();
  private calibrator = new EyeCalibrator();
  private perclos = new PerclosBuffer(RETENTION_MS);
  private fpsMeter = new FpsMeter();
  private events: BlinkEvent[] = [];
  private yawns: YawnEvent[] = [];
  private qualityLog: { t: number; limited: boolean }[] = [];
  private jawOpenSince: number | null = null;
  private lastNose: Point3 | null = null;
  private firstFrameAt: number | null = null;
  private metricsStartedAt: number | null = null;

  get calibration(): CalibrationState {
    return this.calibrator.current;
  }

  get sessionStart(): number | null {
    return this.metricsStartedAt;
  }

  startCalibration(): CalibrationState {
    this.detector.reset();
    this.clearMetrics();
    return this.calibrator.start();
  }

  skipBlinkCheck(t: number): CalibrationState {
    const state = this.calibrator.skipBlinkCheck(t);
    if (state.phase === "ready") this.beginMetrics(t);
    return state;
  }

  resetAll(): void {
    this.detector.reset();
    this.calibrator.reset();
    this.fpsMeter.reset();
    this.clearMetrics();
    this.firstFrameAt = null;
    this.lastNose = null;
  }

  recentEvents(sinceMs = RETENTION_MS, now = performance.now()): BlinkEvent[] {
    return this.events.filter((e) => e.endedAt > now - sinceMs);
  }

  process(obs: FaceObservation): AnalyzerOutput {
    const t = obs.timestampMs;
    if (this.firstFrameAt === null) this.firstFrameAt = t;
    const fps = this.fpsMeter.tick(t);

    const lm = obs.landmarks && obs.landmarks.length >= MIN_LANDMARKS ? obs.landmarks : null;
    const faceVisible = lm !== null;
    const headPose = faceVisible ? headPoseFromMatrix(obs.transformMatrix) : null;
    const reasons: string[] = [];
    let quality: Quality = "good";
    let rawEar: number | null = null;

    if (!lm) {
      quality = "unavailable";
      reasons.push("Rostro no detectado");
      this.lastNose = null;
    } else {
      const faceWidth = Math.abs((lm[FACE_RIGHT]?.x ?? 0) - (lm[FACE_LEFT]?.x ?? 0));
      if (faceWidth < EYE_CONFIG.minFaceWidth) {
        quality = worst(quality, "limited");
        reasons.push("Rostro demasiado lejos");
      }

      const yaw = Math.abs(headPose?.yaw ?? 0);
      const pitch = Math.abs(headPose?.pitch ?? 0);
      if (yaw > EYE_CONFIG.yawUnavailableDeg) {
        quality = "unavailable";
        reasons.push("Cabeza muy girada");
      } else if (yaw > EYE_CONFIG.yawLimitedDeg || pitch > EYE_CONFIG.pitchLimitedDeg) {
        quality = worst(quality, "limited");
        reasons.push("Cabeza girada o inclinada");
      }

      if (obs.brightness !== null && obs.brightness < EYE_CONFIG.minBrightness) {
        quality = worst(quality, "limited");
        reasons.push("Iluminación insuficiente");
      }

      const nose = lm[NOSE_TIP];
      if (nose && this.lastNose) {
        const jump = Math.hypot(nose.x - this.lastNose.x, nose.y - this.lastNose.y);
        if (jump > MAX_FACE_JUMP) {
          quality = worst(quality, "limited");
          reasons.push("Movimiento brusco");
        }
      }
      this.lastNose = nose ?? null;

      const left = eyeAspectRatio(lm, EYE_CONFIG.leftEye);
      const right = eyeAspectRatio(lm, EYE_CONFIG.rightEye);
      if (yaw > EYE_CONFIG.yawLimitedDeg) {
        // With the head turned, trust only the eye facing the camera.
        rawEar =
          cornerWidth(lm, EYE_CONFIG.leftEye) >= cornerWidth(lm, EYE_CONFIG.rightEye) ? left : right;
      } else if (left !== null && right !== null) {
        rawEar = (left + right) / 2;
      } else {
        rawEar = left ?? right;
        if (rawEar !== null) {
          quality = worst(quality, "limited");
          reasons.push("Un ojo no visible");
        }
      }

      if (rawEar === null) {
        quality = "unavailable";
        reasons.push("Ojos no visibles");
      }
    }

    if (t - this.firstFrameAt > FPS_WARMUP_MS && assessFps(fps) === "limited") {
      quality = worst(quality, "limited");
      reasons.push(`FPS bajos (${fps})`);
    }

    const usable = quality !== "unavailable";
    let calibration = this.calibrator.current;

    if (calibration.phase === "collecting_open") {
      calibration = this.calibrator.addOpenSample(t, rawEar, usable);
    }

    const baseline = calibration.baselineEar;
    const normalizedEar = baseline && usable && rawEar !== null ? rawEar / baseline : null;

    let event: BlinkEvent | null = null;
    let closedSince: number | null = null;
    let calibrationJustCompleted = false;

    if (baseline) {
      const update = this.detector.update({ timestampMs: t, normalizedEar });
      event = update.event;
      closedSince = update.closedSince;

      if (calibration.phase === "blink_check") {
        calibration = this.calibrator.addBlinkCheck(t, event !== null);
        if (calibration.phase === "ready") {
          calibrationJustCompleted = true;
          this.beginMetrics(t);
          event = null;
        }
      } else if (calibration.phase === "ready") {
        if (event) this.events.push(event);
        this.perclos.push(
          t,
          normalizedEar !== null,
          normalizedEar !== null && normalizedEar <= EYE_CONFIG.perclosClosedThreshold,
        );
        this.qualityLog.push({ t, limited: quality === "limited" });
      }
    }

    let yawn: YawnEvent | null = null;
    const jaw = obs.blendshapes?.jawOpen ?? null;
    if (faceVisible && jaw !== null && jaw > EYE_CONFIG.jawOpenThreshold) {
      this.jawOpenSince ??= t;
    } else if (this.jawOpenSince !== null) {
      const durationMs = t - this.jawOpenSince;
      if (durationMs >= EYE_CONFIG.yawnMinMs && calibration.phase === "ready") {
        yawn = { startedAt: this.jawOpenSince, endedAt: t, durationMs };
        this.yawns.push(yawn);
      }
      this.jawOpenSince = null;
    }

    this.prune(t);

    const frame: OcularFrame = {
      timestampMs: t,
      faceVisible,
      eyeState: baseline && usable ? this.detector.currentState : "unknown",
      normalizedEar,
      leftBlinkScore: obs.blendshapes?.eyeBlinkLeft ?? null,
      rightBlinkScore: obs.blendshapes?.eyeBlinkRight ?? null,
      jawOpenScore: jaw,
      headPose,
      fps,
      quality,
      qualityReasons: reasons,
    };

    return { frame, calibration, rawEar, closedSince, event, yawn, calibrationJustCompleted };
  }

  summary(now: number, windowSec: 60 | 300): OcularSummary {
    const empty: OcularSummary = {
      windowSec,
      blinksPerMin: null,
      meanBlinkDurationMs: null,
      perclos: null,
      prolongedClosures: 0,
      longClosures: 0,
      possibleYawns: null,
      validCoverage: 0,
      quality: "unavailable",
      origin: "camera_live",
    };
    if (this.metricsStartedAt === null) return empty;

    const from = now - windowSec * 1000;
    const p = this.perclos.compute(now, windowSec, this.metricsStartedAt);
    const inWindow = this.events.filter((e) => e.endedAt > from && e.endedAt <= now);
    const blinks = inWindow.filter((e) => e.kind === "blink");
    const enough = p.perclos !== null;

    const qualitySamples = this.qualityLog.filter((q) => q.t > from);
    const limitedRatio = qualitySamples.length
      ? qualitySamples.filter((q) => q.limited).length / qualitySamples.length
      : 1;

    let quality: Quality = "good";
    if (!enough) quality = p.validCoverage > 0 ? "limited" : "unavailable";
    else if (limitedRatio > 0.3) quality = "limited";

    return {
      windowSec,
      blinksPerMin: enough ? inWindow.length / (p.validMs / 60_000) : null,
      meanBlinkDurationMs: blinks.length
        ? blinks.reduce((s, e) => s + e.durationMs, 0) / blinks.length
        : null,
      perclos: p.perclos,
      prolongedClosures: inWindow.filter((e) => e.kind === "prolonged_closure").length,
      longClosures: inWindow.filter((e) => e.kind === "long_closure").length,
      possibleYawns: enough ? this.yawns.filter((y) => y.endedAt > from).length : null,
      validCoverage: p.validCoverage,
      quality,
      origin: "camera_live",
    };
  }

  private beginMetrics(t: number): void {
    this.clearMetrics();
    this.metricsStartedAt = t;
  }

  private clearMetrics(): void {
    this.events = [];
    this.yawns = [];
    this.qualityLog = [];
    this.perclos.clear();
    this.jawOpenSince = null;
    this.metricsStartedAt = null;
  }

  private prune(t: number): void {
    const cutoff = t - RETENTION_MS;
    if (this.events.length && this.events[0].endedAt < cutoff) {
      this.events = this.events.filter((e) => e.endedAt >= cutoff);
    }
    if (this.yawns.length && this.yawns[0].endedAt < cutoff) {
      this.yawns = this.yawns.filter((y) => y.endedAt >= cutoff);
    }
    let drop = 0;
    while (drop < this.qualityLog.length && this.qualityLog[drop].t < cutoff) drop++;
    if (drop) this.qualityLog.splice(0, drop);
  }
}
