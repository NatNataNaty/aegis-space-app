import { create } from "zustand";
import { missionStartMs } from "../features/mission/missionClock";

interface MissionState {
  /** Mission time at the moment the clock was (re)started. */
  baseMissionMs: number;
  startedAt: number;
  missionMs: number;
  restart: (startMinute: number) => void;
  tick: () => void;
}

export const useMissionStore = create<MissionState>((set, get) => ({
  baseMissionMs: 0,
  startedAt: Date.now(),
  missionMs: 0,
  restart: (startMinute) => {
    const base = missionStartMs(startMinute);
    set({ baseMissionMs: base, startedAt: Date.now(), missionMs: base });
  },
  tick: () => {
    const { baseMissionMs, startedAt } = get();
    set({ missionMs: baseMissionMs + (Date.now() - startedAt) });
  },
}));
