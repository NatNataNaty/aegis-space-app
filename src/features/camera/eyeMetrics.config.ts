/**
 * Experimental detector parameters. They are engineering choices for the demo,
 * not medical thresholds, and must be tuned with the real camera.
 */
export const EYE_CONFIG = {
  rightEye: [33, 160, 158, 133, 153, 144] as const,
  leftEye: [362, 385, 387, 263, 373, 380] as const,

  closeThreshold: 0.68,
  openThreshold: 0.78,
  confirmFrames: 2,
  /** Gap of invalid frames after which the eye state becomes unknown. */
  maxInvalidGapMs: 500,

  blinkMaxMs: 400,
  prolongedMaxMs: 500,

  perclosClosedThreshold: 0.2,
  perclosMinRunMs: 400,
  /** Max time credited to a single frame; larger gaps are treated as missing data. */
  maxFrameDtMs: 200,
  perclosMinValidMs: { 60: 30_000, 300: 120_000 } as const,
  minCoverage: 0.6,

  minFps: 15,
  targetFps: 20,

  yawLimitedDeg: 25,
  yawUnavailableDeg: 40,
  pitchLimitedDeg: 25,
  minFaceWidth: 0.12,
  minBrightness: 45,

  jawOpenThreshold: 0.5,
  yawnMinMs: 1500,

  calibrationOpenMs: 4000,
  calibrationMinSamples: 30,
  calibrationMinBaseline: 0.15,
  calibrationBlinkTarget: 3,
  calibrationBlinkTimeoutMs: 12_000,
} as const;

export type EyeConfig = typeof EYE_CONFIG;
