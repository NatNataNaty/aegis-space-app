export type DataOrigin = "camera_live" | "simulated" | "user_reported" | "local_test";

export type CameraMode = "expanded" | "minimized" | "metrics_only" | "paused";

export type CameraView = Exclude<CameraMode, "paused">;

export type CameraStatus = "idle" | "starting" | "active" | "paused" | "error";

export type CameraErrorCode =
  | "denied"
  | "no_camera"
  | "in_use"
  | "insecure"
  | "unsupported"
  | "model"
  | "unknown";

export type EyeState = "open" | "closing" | "closed" | "unknown";

export type Quality = "good" | "limited" | "unavailable";

export type Delegate = "GPU" | "CPU";

export interface MetricReading<T = number> {
  id: string;
  value: T | null;
  unit: string;
  origin: DataOrigin;
  recordedAt: number;
  quality?: Quality;
  note?: string;
}

export interface HeadPose {
  pitch: number;
  yaw: number;
  roll: number;
}

export interface Point3 {
  x: number;
  y: number;
  z?: number;
}

export interface OcularFrame {
  timestampMs: number;
  faceVisible: boolean;
  eyeState: EyeState;
  normalizedEar: number | null;
  leftBlinkScore: number | null;
  rightBlinkScore: number | null;
  jawOpenScore: number | null;
  headPose: HeadPose | null;
  fps: number;
  quality: Quality;
  qualityReasons: string[];
}

export type BlinkKind = "blink" | "prolonged_closure" | "long_closure";

export interface BlinkEvent {
  startedAt: number;
  endedAt: number;
  durationMs: number;
  kind: BlinkKind;
}

export interface YawnEvent {
  startedAt: number;
  endedAt: number;
  durationMs: number;
}

export interface OcularSummary {
  windowSec: 60 | 300;
  blinksPerMin: number | null;
  meanBlinkDurationMs: number | null;
  perclos: number | null;
  prolongedClosures: number;
  longClosures: number;
  possibleYawns: number | null;
  validCoverage: number;
  quality: Quality;
  origin: "camera_live";
}

export type CalibrationPhase = "idle" | "collecting_open" | "blink_check" | "ready";

export interface CalibrationState {
  phase: CalibrationPhase;
  progress: number;
  blinksDetected: number;
  baselineEar: number | null;
  message: string;
  completedAt: number | null;
}

/** Raw per-frame input coming from Face Landmarker, independent of the library types. */
export interface FaceObservation {
  timestampMs: number;
  landmarks: Point3[] | null;
  blendshapes: Record<string, number> | null;
  transformMatrix: number[] | null;
  brightness: number | null;
}
