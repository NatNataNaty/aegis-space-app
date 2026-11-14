import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { useCameraStore } from "../../stores/camera.store";
import { CameraError, CAMERA_ERROR_TEXT, attachStream, openCamera, stopStream } from "./camera.service";
import type { FaceObservation, Point3 } from "./camera.types";
import { EYE_CONFIG } from "./eyeMetrics.config";
import { detectFrame, getFaceLandmarker } from "./faceLandmarker.service";
import { OcularAnalyzer } from "./ocularMetrics";
import { clearOverlay, drawOverlay } from "./overlay";

const UI_INTERVAL_MS = 100;
const SUMMARY_INTERVAL_MS = 500;
const TREND_INTERVAL_MS = 10_000;
const TREND_MAX_POINTS = 90;
const EVENTS_MAX = 200;
const BRIGHTNESS_INTERVAL_MS = 1000;
const WATCHDOG_MS = 700;

type VideoWithRvfc = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number) => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

/**
 * Owns the single camera stream, the single Face Landmarker instance and the single frame loop.
 * React components only bind the persistent <video>/<canvas> elements and read the store.
 */
class OcularSession {
  private video: VideoWithRvfc | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private stream: MediaStream | null = null;
  private landmarker: FaceLandmarker | null = null;
  private analyzer = new OcularAnalyzer();

  private running = false;
  private loopToken = 0;
  private useRaf = false;
  private rvfcHandle: number | null = null;
  private rafHandle: number | null = null;
  private watchdog: number | null = null;

  private allowance = 1;
  private lastTick = 0;
  private lastFrameAt = 0;
  private lastVideoTime = -1;
  private lastUiPush = 0;
  private lastSummary = 0;
  private lastTrend = 0;
  private lastBrightnessAt = 0;
  private brightness: number | null = null;
  private lumaCanvas: HTMLCanvasElement | null = null;

  bindElements(video: HTMLVideoElement | null, canvas: HTMLCanvasElement | null): void {
    this.video = video as VideoWithRvfc | null;
    this.canvas = canvas;
  }

  async start(): Promise<void> {
    const store = useCameraStore.getState();
    if (store.status === "starting" || store.status === "active" || !this.video) return;

    store.patch({
      status: "starting",
      error: null,
      modelState: this.landmarker ? "ready" : "loading",
    });

    let stream: MediaStream | null = null;
    try {
      const [s, handle] = await Promise.all([
        openCamera(),
        getFaceLandmarker().catch((err) => {
          throw new CameraError("model", `${CAMERA_ERROR_TEXT.model} ${String(err?.message ?? "")}`.trim());
        }),
      ]);
      stream = s;
      this.landmarker = handle.landmarker;
      useCameraStore.getState().patch({ modelState: "ready", delegate: handle.delegate });

      if (!this.video) throw new CameraError("unknown", CAMERA_ERROR_TEXT.unknown);
      await attachStream(this.video, stream);
    } catch (err) {
      stopStream(stream, this.video);
      const e = err instanceof CameraError ? err : new CameraError("unknown", CAMERA_ERROR_TEXT.unknown);
      useCameraStore.getState().patch({
        status: "error",
        error: { code: e.code, message: e.message },
        modelState: e.code === "model" ? "error" : this.landmarker ? "ready" : "idle",
      });
      return;
    }

    this.stream = stream;
    stream.getVideoTracks().forEach((track) =>
      track.addEventListener("ended", () => {
        if (this.stream === stream) this.pause();
      }),
    );

    this.analyzer.resetAll();
    const calibration = this.analyzer.startCalibration();
    this.resetTimers();

    useCameraStore.getState().patch({
      status: "active",
      calibration,
      frame: null,
      closedSince: null,
      lastEvent: null,
      events: [],
      summary60: null,
      summary300: null,
      trend: [],
      sessionStartedAt: Date.now(),
      clockOffset: Date.now() - performance.now(),
    });

    this.running = true;
    this.loopToken += 1;
    this.useRaf = typeof this.video?.requestVideoFrameCallback !== "function";
    this.schedule(this.loopToken);
    this.startWatchdog();
  }

  pause(): void {
    this.running = false;
    this.loopToken += 1;
    this.cancelLoop();
    stopStream(this.stream, this.video);
    this.stream = null;
    clearOverlay(this.canvas);
    const store = useCameraStore.getState();
    if (store.status === "active" || store.status === "starting") {
      store.patch({ status: "paused", closedSince: null });
    }
  }

  recalibrate(): void {
    if (!this.running) return;
    const calibration = this.analyzer.startCalibration();
    useCameraStore.getState().patch({
      calibration,
      lastEvent: null,
      events: [],
      summary60: null,
      summary300: null,
      trend: [],
    });
  }

  skipBlinkCheck(): void {
    const calibration = this.analyzer.skipBlinkCheck(performance.now());
    useCameraStore.getState().patch({ calibration });
  }

  redrawOverlayVisibility(): void {
    const { showOverlay, view } = useCameraStore.getState();
    if (!showOverlay || view === "metrics_only") clearOverlay(this.canvas);
  }

  private resetTimers(): void {
    this.allowance = 1;
    this.lastTick = 0;
    this.lastFrameAt = performance.now();
    this.lastVideoTime = -1;
    this.lastUiPush = 0;
    this.lastSummary = 0;
    this.lastTrend = performance.now();
    this.lastBrightnessAt = 0;
    this.brightness = null;
  }

  private schedule(token: number): void {
    const video = this.video;
    if (!this.running || token !== this.loopToken || !video) return;

    if (!this.useRaf && video.requestVideoFrameCallback) {
      this.rvfcHandle = video.requestVideoFrameCallback(() => {
        if (token !== this.loopToken) return;
        this.onFrame();
        this.schedule(token);
      });
    } else {
      this.rafHandle = requestAnimationFrame(() => {
        if (token !== this.loopToken) return;
        if (video.currentTime !== this.lastVideoTime) {
          this.lastVideoTime = video.currentTime;
          this.onFrame();
        }
        this.schedule(token);
      });
    }
  }

  private cancelLoop(): void {
    if (this.rvfcHandle !== null) this.video?.cancelVideoFrameCallback?.(this.rvfcHandle);
    if (this.rafHandle !== null) cancelAnimationFrame(this.rafHandle);
    if (this.watchdog !== null) window.clearInterval(this.watchdog);
    this.rvfcHandle = null;
    this.rafHandle = null;
    this.watchdog = null;
  }

  /** Some browsers stop firing video-frame callbacks for hidden videos; fall back to rAF. */
  private startWatchdog(): void {
    if (this.watchdog !== null) window.clearInterval(this.watchdog);
    this.watchdog = window.setInterval(() => {
      if (!this.running || this.useRaf || document.hidden) return;
      if (performance.now() - this.lastFrameAt > WATCHDOG_MS && this.video && !this.video.paused) {
        if (this.rvfcHandle !== null) this.video.cancelVideoFrameCallback?.(this.rvfcHandle);
        this.rvfcHandle = null;
        this.useRaf = true;
        this.loopToken += 1;
        this.schedule(this.loopToken);
      }
    }, WATCHDOG_MS);
  }

  private onFrame(): void {
    const video = this.video;
    const landmarker = this.landmarker;
    if (!video || !landmarker || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

    const now = performance.now();
    this.lastFrameAt = now;

    // Token bucket: process ~targetFps frames per second regardless of the camera rate.
    if (this.lastTick) {
      this.allowance = Math.min(1, this.allowance + ((now - this.lastTick) * EYE_CONFIG.targetFps) / 1000);
    }
    this.lastTick = now;
    if (this.allowance < 1) return;
    this.allowance -= 1;

    if (now - this.lastBrightnessAt > BRIGHTNESS_INTERVAL_MS) {
      this.lastBrightnessAt = now;
      this.brightness = this.measureBrightness(video);
    }

    const result = detectFrame(landmarker, video, now);
    const landmarks = (result?.faceLandmarks?.[0] as Point3[] | undefined) ?? null;
    const categories = result?.faceBlendshapes?.[0]?.categories;
    const blendshapes = categories
      ? Object.fromEntries(categories.map((c) => [c.categoryName, c.score]))
      : null;

    const obs: FaceObservation = {
      timestampMs: now,
      landmarks,
      blendshapes,
      transformMatrix: result?.facialTransformationMatrixes?.[0]?.data ?? null,
      brightness: this.brightness,
    };

    const out = this.analyzer.process(obs);
    const store = useCameraStore.getState();

    if (this.canvas) {
      if (store.showOverlay && store.view !== "metrics_only") {
        drawOverlay(this.canvas, video, landmarks, out.frame.eyeState);
      } else {
        clearOverlay(this.canvas);
      }
    }

    const patch: Parameters<typeof store.patch>[0] = {};
    let push = false;

    if (out.event) {
      patch.lastEvent = out.event;
      patch.events = [...store.events, out.event].slice(-EVENTS_MAX);
      push = true;
    }
    if (out.calibration !== store.calibration && out.calibration.phase !== store.calibration.phase) {
      push = true;
    }
    if (out.calibrationJustCompleted) {
      patch.events = [];
      patch.lastEvent = null;
      patch.trend = [];
    }
    if (push || now - this.lastUiPush >= UI_INTERVAL_MS) {
      this.lastUiPush = now;
      patch.frame = out.frame;
      patch.calibration = out.calibration;
      patch.closedSince = out.closedSince;
      patch.lastReadingAt = Date.now();
      push = true;
    }

    if (now - this.lastSummary >= SUMMARY_INTERVAL_MS) {
      this.lastSummary = now;
      patch.summary60 = this.analyzer.summary(now, 60);
      patch.summary300 = this.analyzer.summary(now, 300);
      push = true;

      if (this.analyzer.sessionStart !== null && now - this.lastTrend >= TREND_INTERVAL_MS) {
        this.lastTrend = now;
        const base = patch.trend ?? store.trend;
        patch.trend = [
          ...base,
          {
            t: Date.now(),
            perclos: patch.summary60.perclos,
            blinksPerMin: patch.summary60.blinksPerMin,
          },
        ].slice(-TREND_MAX_POINTS);
      }
    }

    if (push) store.patch(patch);
  }

  private measureBrightness(video: HTMLVideoElement): number | null {
    try {
      if (!this.lumaCanvas) {
        this.lumaCanvas = document.createElement("canvas");
        this.lumaCanvas.width = 32;
        this.lumaCanvas.height = 24;
      }
      const ctx = this.lumaCanvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, 32, 24);
      const { data } = ctx.getImageData(0, 0, 32, 24);
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      }
      ctx.clearRect(0, 0, 32, 24);
      return sum / (data.length / 4);
    } catch {
      return null;
    }
  }
}

export const ocularSession = new OcularSession();

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => ocularSession.pause());
}
