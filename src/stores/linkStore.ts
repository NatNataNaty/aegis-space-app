import { create } from "zustand";

export type DelayMode = "none" | "moon" | "mars";

export const DELAY_MS: Record<DelayMode, number> = {
  none: 0,
  moon: 3000,
  mars: 15000,
};

export interface GroundNote {
  id?: string;
  mission_id?: string;
  author_role: string;
  title: string;
  note: string;
  priority: "low" | "normal" | "urgent" | "emergency";
  created_at: string;
  updated_at?: string;
}

interface LinkState {
  isLinkActive: boolean;
  delayMode: DelayMode;
  pendingCount: number;
  lastSyncAt: string | null;
  isSyncing: boolean;
  groundNotes: GroundNote[];

  setLinkActive: (active: boolean) => void;
  setDelayMode: (mode: DelayMode) => void;
  setPendingCount: (count: number) => void;
  setLastSyncAt: (timestamp: string | null) => void;
  setIsSyncing: (syncing: boolean) => void;
  setGroundNotes: (notes: GroundNote[]) => void;
  addGroundNote: (note: GroundNote) => void;
  getDelayMs: () => number;
}

export const useLinkStore = create<LinkState>((set, get) => ({
  isLinkActive: true,
  delayMode: "none",
  pendingCount: 0,
  lastSyncAt: null,
  isSyncing: false,
  groundNotes: [],

  setLinkActive: (active) => set({ isLinkActive: active }),
  setDelayMode: (mode) => set({ delayMode: mode }),
  setPendingCount: (count) => set({ pendingCount: count }),
  setLastSyncAt: (timestamp) => set({ lastSyncAt: timestamp }),
  setIsSyncing: (syncing) => set({ isSyncing: syncing }),
  setGroundNotes: (notes) => set({ groundNotes: notes }),
  addGroundNote: (note) =>
    set((state) => ({
      groundNotes: [note, ...state.groundNotes.filter((n) => n.id !== note.id)],
    })),
  getDelayMs: () => DELAY_MS[get().delayMode] ?? 0,
}));
