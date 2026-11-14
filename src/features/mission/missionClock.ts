export const MISSION = {
  id: "ARES-01",
  name: "Tránsito a Marte",
  crewMember: "Especialista de misión 2",
  /** Mission day shown when the demo starts. */
  startDay: 142,
} as const;

export const DAY_MS = 86_400_000;

export interface MissionTime {
  /** Milliseconds since mission day 0, 00:00. */
  missionMs: number;
  day: number;
  minuteOfDay: number;
  label: string;
  clock: string;
}

export function missionStartMs(startMinute: number): number {
  return MISSION.startDay * DAY_MS + startMinute * 60_000;
}

export function toMissionTime(missionMs: number): MissionTime {
  const day = Math.floor(missionMs / DAY_MS);
  const msOfDay = missionMs - day * DAY_MS;
  const totalSec = Math.floor(msOfDay / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    missionMs,
    day,
    minuteOfDay: h * 60 + m,
    clock: `${pad(h)}:${pad(m)}:${pad(s)}`,
    label: `D${day} ${pad(h)}:${pad(m)}`,
  };
}

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min`;
}

export function formatMinuteOfDay(min: number): string {
  const v = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
}
