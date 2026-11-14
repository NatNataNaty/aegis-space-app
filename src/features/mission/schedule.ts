export type BlockKind = "sleep" | "work" | "exercise" | "meal" | "personal";

export interface ScheduleBlock {
  /** Minute of the mission day, 0–1439. `end` may wrap past midnight. */
  start: number;
  end: number;
  kind: BlockKind;
  label: string;
}

export const BLOCK_LABEL: Record<BlockKind, string> = {
  sleep: "Descanso",
  work: "Trabajo",
  exercise: "Ejercicio",
  meal: "Comida",
  personal: "Tiempo personal",
};

export const hm = (h: number, m = 0) => h * 60 + m;

function contains(block: ScheduleBlock, minute: number): boolean {
  return block.start <= block.end
    ? minute >= block.start && minute < block.end
    : minute >= block.start || minute < block.end;
}

export function blockAt(schedule: readonly ScheduleBlock[], minute: number): ScheduleBlock | null {
  return schedule.find((b) => contains(b, minute)) ?? null;
}

export function isRestPeriod(schedule: readonly ScheduleBlock[], minute: number): boolean {
  return blockAt(schedule, minute)?.kind === "sleep";
}

export function blockDuration(block: ScheduleBlock): number {
  return block.end >= block.start ? block.end - block.start : 1440 - block.start + block.end;
}

/** Minutes until the next sleep block starts (0 if currently resting). */
export function minutesUntilRest(schedule: readonly ScheduleBlock[], minute: number): number {
  if (isRestPeriod(schedule, minute)) return 0;
  const starts = schedule.filter((b) => b.kind === "sleep").map((b) => (b.start - minute + 1440) % 1440);
  return starts.length ? Math.min(...starts) : 0;
}

/** Minutes since the last sleep block ended. */
export function minutesSinceRest(schedule: readonly ScheduleBlock[], minute: number): number {
  if (isRestPeriod(schedule, minute)) return 0;
  const ends = schedule.filter((b) => b.kind === "sleep").map((b) => (minute - b.end + 1440) % 1440);
  return ends.length ? Math.min(...ends) : 0;
}
