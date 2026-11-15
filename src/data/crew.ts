import { create } from "zustand";
import type { ScenarioId } from "../features/simulation/simulation.types";
import { loadPref, savePref } from "../lib/storage";

/**
 * Tripulación FICTICIA de la demo (misión ARES-01). Ninguna corresponde a una persona real.
 * Cada tripulante tiene su perfil y su escenario simulado: al reconocer un rostro, el panel
 * pasa a mostrar los datos de esa persona. Los datos personales solo los ven su dueño y el oficial médico.
 */
export type CrewRole = "commander" | "pilot" | "specialist" | "medical";

export interface CrewMember {
  id: string;
  name: string;
  initials: string;
  role: CrewRole;
  age: number;
  heightM: number;
  weightKg: number;
  bloodType: string;
  /** Escenario simulado de sus signos (cada tripulante vive un día distinto). */
  scenarioId: ScenarioId;
  /** Compañero de apoyo (id). */
  buddyId: string;
}

export const CREW: CrewMember[] = [
  { id: "AR1-001", name: "Valeria Choque", initials: "VC", role: "commander", age: 44, heightM: 1.63, weightKg: 59, bloodType: "A+", scenarioId: "accumulated_fatigue", buddyId: "AR1-004" },
  { id: "AR1-002", name: "Elena Marín", initials: "EM", role: "specialist", age: 38, heightM: 1.68, weightKg: 62, bloodType: "O+", scenarioId: "stable", buddyId: "AR1-003" },
  { id: "AR1-003", name: "Camila Rojas", initials: "CR", role: "pilot", age: 36, heightM: 1.66, weightKg: 60, bloodType: "B+", scenarioId: "sleep_deficit", buddyId: "AR1-002" },
  { id: "AR1-004", name: "Daniel Okafor", initials: "DO", role: "medical", age: 41, heightM: 1.82, weightKg: 81, bloodType: "AB-", scenarioId: "recovery", buddyId: "AR1-001" },
];

export const crewById = (id: string | null | undefined) => CREW.find((c) => c.id === id);

const DEFAULT_ID = "AR1-002";

interface CrewState {
  /** Tripulante que usa la tableta ahora (el último reconocido). */
  activeId: string;
  setActive: (id: string) => void;
}

export const useCrewStore = create<CrewState>((set) => ({
  activeId: crewById(loadPref<string>("crew.active", DEFAULT_ID))?.id ?? DEFAULT_ID,
  setActive: (id) => {
    if (!crewById(id)) return;
    savePref("crew.active", id);
    set({ activeId: id });
  },
}));

/** Tripulante activo, para código fuera de React (reportes a la Tierra, registro). */
export const activeCrew = (): CrewMember => crewById(useCrewStore.getState().activeId) ?? CREW[1];

/** Compatibilidad: perfil por defecto de la demo. */
export const CREW_PROFILE = CREW[1];

/** Tripulante activo dentro de componentes React. */
export const useActiveCrew = (): CrewMember => {
  const id = useCrewStore((s) => s.activeId);
  return crewById(id) ?? CREW[1];
};
