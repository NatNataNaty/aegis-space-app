import { create } from "zustand";
import type {
  BlinkEvent,
  CalibrationState,
  CameraErrorCode,
  CameraStatus,
  CameraView,
  Delegate,
  OcularFrame,
  OcularSummary,
} from "../features/camera/camera.types";
import { initialCalibration } from "../features/camera/eyeCalibration";
import { loadPref, savePref } from "../lib/storage";

export interface LiveTrendPoint {
  t: number;
  perclos: number | null;
  blinksPerMin: number | null;
}

export interface CameraState {
  status: CameraStatus;
  view: CameraView;
  showOverlay: boolean;
  error: { code: CameraErrorCode; message: string } | null;
  modelState: "idle" | "loading" | "ready" | "error";
  delegate: Delegate | null;

  frame: OcularFrame | null;
  calibration: CalibrationState;
  closedSince: number | null;
  lastEvent: BlinkEvent | null;
  events: BlinkEvent[];
  summary60: OcularSummary | null;
  summary300: OcularSummary | null;
  trend: LiveTrendPoint[];
  /** Wall-clock time of the last live reading, kept after pausing. */
  lastReadingAt: number | null;
  /** Wall-clock offset to convert performance.now() stamps. */
  clockOffset: number;
  sessionStartedAt: number | null;

  setView: (view: CameraView) => void;
  toggleOverlay: () => void;
  patch: (partial: Partial<CameraState>) => void;
}

export const useCameraStore = create<CameraState>((set) => ({
  status: "idle",
  view: loadPref<CameraView>("cameraView", "expanded"),
  showOverlay: loadPref<boolean>("showOverlay", true),
  error: null,
  modelState: "idle",
  delegate: null,

  frame: null,
  calibration: initialCalibration(),
  closedSince: null,
  lastEvent: null,
  events: [],
  summary60: null,
  summary300: null,
  trend: [],
  lastReadingAt: null,
  clockOffset: Date.now() - performance.now(),
  sessionStartedAt: null,

  setView: (view) => {
    savePref("cameraView", view);
    set({ view });
  },
  toggleOverlay: () =>
    set((s) => {
      savePref("showOverlay", !s.showOverlay);
      return { showOverlay: !s.showOverlay };
    }),
  patch: (partial) => set(partial),
}));
