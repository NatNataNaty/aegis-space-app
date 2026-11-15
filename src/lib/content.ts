import { z } from "zod";
import alertsRaw from "../../content/alerts.json";
import hazardsRaw from "../../content/hazards.json";
import protocolsRaw from "../../content/protocols.json";
import risksRaw from "../../content/risks.json";
import studiesRaw from "../../content/studies.json";
import {
  alertsFileSchema,
  earthBenefitSchema,
  hazardSchema,
  protocolSchema,
  riskSchema,
  studySchema,
  type AlertRule,
  type Localized,
  type Protocol,
} from "./schemas/content";

/**
 * Base de conocimiento empaquetada en la app (sin red). Se valida con Zod al cargar:
 * si un archivo de /content no cumple el contrato, el build de tests falla antes de llegar a la nave.
 */
export const HAZARDS = z.array(hazardSchema).length(5).parse(hazardsRaw);
export const RISKS = z.array(riskSchema).length(17).parse(risksRaw);
export const STUDIES = z.array(studySchema).parse(studiesRaw.studies);
export const EARTH_BENEFITS = z.array(earthBenefitSchema).parse(studiesRaw.earthBenefits);
export const PROTOCOLS = z.array(protocolSchema).min(1).parse(protocolsRaw);
const ALERTS = alertsFileSchema.parse(alertsRaw);

export const HRP_RISKS_URL = "https://www.nasa.gov/hrp/risks/";
export const HRP_RESEARCH_URL = "https://www.nasa.gov/hrp/ongoing-hrp-research/";

const protocolsById = new Map(PROTOCOLS.map((p) => [p.id, p]));
const rulesById = new Map(ALERTS.rules.map((r) => [r.alertId, r]));
const symptomToProtocol = new Map(ALERTS.symptoms.map((s) => [s.symptom, s.protocolId]));

export const getProtocol = (id: string): Protocol | undefined => protocolsById.get(id);
export const getAlertRule = (alertId: string): AlertRule | undefined => rulesById.get(alertId);
export const protocolForSymptom = (symptom: string): string | undefined => symptomToProtocol.get(symptom);

export const riskById = (id: string) => RISKS.find((r) => r.id === id);

/** Texto en el idioma activo; si falta, español (idioma de referencia del contenido). */
export const pick = (text: Localized, lang: string): string => (lang.startsWith("en") ? text.en : text.es);

/** Comprobaciones cruzadas que Zod no ve archivo a archivo. */
export function contentIntegrityErrors(): string[] {
  const errors: string[] = [];
  const riskIds = new Set(RISKS.map((r) => r.id));
  for (const p of PROTOCOLS) if (p.riskId && !riskIds.has(p.riskId)) errors.push(`protocol ${p.id}: riesgo ${p.riskId} no existe`);
  for (const s of STUDIES) for (const r of s.riskIds) if (!riskIds.has(r)) errors.push(`study ${s.id}: riesgo ${r} no existe`);
  for (const b of EARTH_BENEFITS) for (const r of b.riskIds) if (!riskIds.has(r)) errors.push(`benefit ${b.id}: riesgo ${r} no existe`);
  for (const r of ALERTS.rules) if (!protocolsById.has(r.protocolId)) errors.push(`alert ${r.alertId}: protocolo ${r.protocolId} no existe`);
  for (const s of ALERTS.symptoms) if (!protocolsById.has(s.protocolId)) errors.push(`symptom ${s.symptom}: protocolo ${s.protocolId} no existe`);
  if (new Set(PROTOCOLS.map((p) => p.id)).size !== PROTOCOLS.length) errors.push("ids de protocolo duplicados");
  return errors;
}
