import { z } from "zod";

/**
 * Contratos del contenido empaquetado en /content (plan maestro, «Modelo de datos»).
 * Todo texto visible es bilingüe { es, en } y todo dato lleva su fuente oficial.
 */

export const localized = z.object({ es: z.string().min(1), en: z.string().min(1) });
export type Localized = z.infer<typeof localized>;

/** Solo se aceptan las 5 fuentes autorizadas por CLAUDE.md y sus subpáginas. */
const OFFICIAL_SOURCE = /^https:\/\/(www\.nasa\.gov\/(hrp|reference|missions|humans-in-space)\/|www\.asc-csa\.gc\.ca\/eng\/)/;
export const sourceUrl = z.string().regex(OFFICIAL_SOURCE, "La fuente debe ser una página oficial de NASA HRP o de la CSA");

/**
 * Fuentes de las contramedidas («Cómo prevenirlo»): páginas de NASA y sus documentos técnicos
 * oficiales (informes OCHMO, Human Research Roadmap, NTRS) o la CSA. Nunca libros ni webs de terceros.
 */
const NASA_DOC_SOURCE = /^https:\/\/(www\.nasa\.gov\/|ntrs\.nasa\.gov\/|humanresearchroadmap\.nasa\.gov\/|www\.asc-csa\.gc\.ca\/eng\/)/;
export const preventionSchema = z.object({
  text: localized,
  /** Sin URL propia, la fuente es la página oficial del riesgo. */
  sourceUrl: z.string().regex(NASA_DOC_SOURCE, "La contramedida debe venir de un documento oficial de NASA o la CSA").optional(),
});
export type Prevention = z.infer<typeof preventionSchema>;

export const reviewStatus = z.enum(["pendiente", "revisado"]);
export type ReviewStatus = z.infer<typeof reviewStatus>;

export const hazardId = z.enum(["radiation", "isolation", "distance", "gravity", "environment"]);
export type HazardId = z.infer<typeof hazardId>;

export const hazardSchema = z.object({
  id: hazardId,
  /** Letra del acrónimo RIDGE. */
  letter: z.enum(["R", "I", "D", "G", "E"]),
  name: localized,
  summary: localized,
  /** Dato concreto citado de la fuente (vídeo o texto de la página). */
  fact: localized,
  /** Página de la que sale el texto citado. */
  sourceUrl,
  /** Página de la que sale el dato concreto (puede ser la CSA). */
  factSourceUrl: sourceUrl,
  /** Ficha completa del peligro en NASA HRP. */
  moreUrl: sourceUrl,
});
export type Hazard = z.infer<typeof hazardSchema>;

export const riskCategory = z.enum(["physiology", "behavior", "radiation"]);
export type RiskCategory = z.infer<typeof riskCategory>;

export const riskSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  category: riskCategory,
  name: localized,
  summary: localized,
  /** Relación con los 5 peligros: lectura del equipo a partir de los textos de NASA. */
  hazardIds: z.array(hazardId).min(1),
  sourceUrl,
  /** «Cómo prevenirlo»: contramedidas que NASA describe para este riesgo (sin fármacos ni dosis). */
  prevention: z.array(preventionSchema).optional(),
});
export type Risk = z.infer<typeof riskSchema>;

export const studySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  mission: z.enum(["artemis-ii", "iss", "iss-past"]),
  riskIds: z.array(z.string()),
  summary: localized,
  sourceUrl,
});
export type Study = z.infer<typeof studySchema>;

export const earthBenefitSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  text: localized,
  riskIds: z.array(z.string()).min(1),
  sourceUrl,
});
export type EarthBenefit = z.infer<typeof earthBenefitSchema>;

export const stepKind = z.enum(["safety", "action", "notify", "clinical", "record"]);
export type StepKind = z.infer<typeof stepKind>;

export const protocolStepSchema = z.object({
  id: z.string().min(1),
  kind: stepKind,
  text: localized,
  /** Un paso clínico nunca se da por validado: lo exige la regla de oro de CLAUDE.md. */
  reviewStatus,
});
export type ProtocolStep = z.infer<typeof protocolStepSchema>;

export const buddyPolicy = z.enum(["always", "if_no_response", "by_severity", "if_immobile", "optional", "no", "everyone"]);
export type BuddyPolicy = z.infer<typeof buddyPolicy>;

export const protocolSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    riskId: z.string().nullable(),
    title: localized,
    trigger: localized,
    buddy: buddyPolicy,
    escalate: localized,
    /** Máximo 7 pasos visibles por modo (plan maestro, «Estructura de todo protocolo»). */
    solo: z.array(protocolStepSchema).min(2).max(7),
    withBuddy: z.array(protocolStepSchema).min(2).max(7),
    reviewStatus,
    sourceUrl,
  })
  .superRefine((p, ctx) => {
    for (const step of [...p.solo, ...p.withBuddy]) {
      if (step.kind === "clinical" && step.reviewStatus !== "pendiente" && p.reviewStatus !== "revisado") {
        ctx.addIssue({ code: "custom", message: `${p.id}/${step.id}: paso clínico revisado dentro de un protocolo sin revisar` });
      }
    }
  });
export type Protocol = z.infer<typeof protocolSchema>;

/** Enlace de cada alerta del motor con su protocolo y su política de aviso. */
export const alertRuleSchema = z.object({
  alertId: z.string().min(1),
  protocolId: z.string().min(1),
  /** Abre «¿Necesitas ayuda?» a pantalla completa. */
  askForHelp: z.boolean(),
  /** Segundos sin respuesta antes de avisar al compañero (plan: 30 s). 0 = aviso inmediato. */
  buddyAfterSec: z.number().int().min(0).max(120),
  reviewStatus,
});
export type AlertRule = z.infer<typeof alertRuleSchema>;

/** Síntomas del autorreporte → protocolo. */
export const symptomRuleSchema = z.object({
  symptom: z.string().min(1),
  protocolId: z.string().min(1),
});

export const alertsFileSchema = z.object({
  rules: z.array(alertRuleSchema),
  symptoms: z.array(symptomRuleSchema),
});
