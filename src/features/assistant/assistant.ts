import { confidence, type BaselineState } from "../baseline/personalBaseline";
import type { SimSnapshot } from "../simulation/simulation.types";
import { HAZARDS, pick, riskById } from "../../lib/content";

/**
 * Asistente de a bordo SIN modelo de lenguaje: responde preguntas frecuentes con
 * (1) los datos de tu sesión en este equipo y (2) la biblioteca de NASA HRP / CSA que va empaquetada.
 * Cada respuesta dice de dónde sale. No diagnostica ni recomienda fármacos o dosis (CLAUDE.md, OWASP LLM).
 * Determinista: la misma pregunta con los mismos datos da la misma respuesta.
 */

export type IntentId = "today" | "oxygen" | "radiation" | "sleepWeek" | "sleepWhy" | "logSymptom" | "baseline";

export interface AssistantAnswer {
  intent: IntentId | "unknown";
  text: string;
  source: { label: string; url?: string };
  action?: "log" | "emergency";
}

type T = (key: string, vars?: Record<string, unknown>) => string;

/** Palabras clave por intención (ES + EN, sin tildes). */
const KEYWORDS: Record<IntentId, string[]> = {
  today: ["como estoy", "estado", "hoy", "how am i", "today", "status"],
  oxygen: ["oxigeno", "spo2", "saturacion", "oxygen"],
  radiation: ["radiacion", "dosis", "msv", "radiation", "dose"],
  sleepWeek: ["sueno esta semana", "dormi", "semana", "sleep this week", "slept", "week"],
  sleepWhy: ["por que importa dormir", "dormir bien", "why does sleep", "sleep matter", "importa el sueno"],
  logSymptom: ["sintoma", "anotar", "me siento mal", "symptom", "log", "feel sick"],
  baseline: ["normal para mi", "linea base", "aprend", "baseline", "normal for me", "learn"],
};

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[¿?¡!.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Palabras que nunca responde el asistente: lo deriva a Emergencia. */
const UNSAFE = ["dosis de", "medicamento", "farmaco", "pastilla", "ibuprofeno", "paracetamol", "drug", "medication", "pill", "mg "];

export function detectIntent(question: string): IntentId | "unsafe" | "unknown" {
  const q = normalize(question);
  if (UNSAFE.some((w) => q.includes(w))) return "unsafe";
  let best: IntentId | "unknown" = "unknown";
  let bestScore = 0;
  for (const [intent, words] of Object.entries(KEYWORDS) as [IntentId, string[]][]) {
    const score = words.reduce((acc, w) => (q.includes(w) ? acc + w.length : acc), 0);
    if (score > bestScore) {
      best = intent;
      bestScore = score;
    }
  }
  return best;
}

const fmt = (n: number, d = 0, lang = "es") =>
  new Intl.NumberFormat(lang.startsWith("en") ? "en-US" : "es-ES", { maximumFractionDigits: d, minimumFractionDigits: d }).format(n);

export function answer(
  question: string,
  ctx: { snap: SimSnapshot; baseline: BaselineState; alerts: number; day: number; lang: string; t: T },
): AssistantAnswer {
  const { snap, baseline, alerts, day, lang, t } = ctx;
  const intent = detectIntent(question);
  const session = { label: t("assistant.src.session", { day }) };
  const v = snap.vitals;

  if (intent === "unsafe") {
    return { intent: "unknown", text: t("assistant.a.unsafe"), source: { label: t("assistant.src.rules") }, action: "emergency" };
  }

  switch (intent) {
    case "today": {
      const usual = baseline.heartRate.n ? fmt(baseline.heartRate.mean, 0, lang) : "—";
      return {
        intent,
        text: t(alerts ? "assistant.a.todayAlerts" : "assistant.a.today", {
          day,
          hr: fmt(v.heartRate.value, 0, lang),
          usual,
          spo2: fmt(v.spo2.value, 0, lang),
          bp: `${fmt(v.bloodPressure.value, 0, lang)}/${fmt(v.bloodPressure.value2 ?? 0, 0, lang)}`,
          temp: fmt(v.temperature.value, 1, lang),
          sleep: fmt(snap.sleep.lastNightHours, 1, lang),
          count: alerts,
        }),
        source: session,
      };
    }
    case "oxygen": {
      const risk = riskById("hypoxia");
      return {
        intent,
        text: t("assistant.a.oxygen", { spo2: fmt(v.spo2.value, 0, lang) }),
        source: { label: risk ? `NASA HRP · ${pick(risk.name, lang)}` : "NASA HRP", url: risk?.sourceUrl },
      };
    }
    case "radiation": {
      const hz = HAZARDS.find((h) => h.id === "radiation");
      return {
        intent,
        text: t("assistant.a.radiation", { total: fmt(snap.exposure.totalMsv, 1, lang), daily: fmt(snap.exposure.dailyMsv, 1, lang) }),
        source: { label: hz ? `NASA HRP · ${pick(hz.name, lang)}` : "NASA HRP", url: hz?.sourceUrl },
      };
    }
    case "sleepWeek": {
      const nights = snap.trend7d.map((d) => d.sleepHours);
      const avg = nights.reduce((a, b) => a + b, 0) / Math.max(1, nights.length);
      const short = nights.filter((h) => h < 6).length;
      return {
        intent,
        text: t("assistant.a.sleepWeek", { avg: fmt(avg, 1, lang), short, count: nights.length }),
        source: session,
      };
    }
    case "sleepWhy": {
      const risk = riskById("sleep");
      return {
        intent,
        text: t("assistant.a.sleepWhy"),
        source: { label: risk ? `NASA HRP · ${pick(risk.name, lang)}` : "NASA HRP", url: risk?.sourceUrl ?? "https://www.nasa.gov/hrp/hazard-isolation-and-confinement/" },
      };
    }
    case "logSymptom":
      return { intent, text: t("assistant.a.logSymptom"), source: { label: t("assistant.src.app") }, action: "log" };
    case "baseline": {
      const s = baseline.heartRate;
      const conf = confidence(s);
      return {
        intent,
        text:
          conf === "none"
            ? t("assistant.a.baselineNone")
            : t("assistant.a.baseline", { hr: fmt(s.mean, 0, lang), count: s.n, state: t(`hero.learnState.${conf}`) }),
        source: session,
      };
    }
    default:
      return { intent: "unknown", text: t("assistant.a.unknown"), source: { label: t("assistant.src.rules") } };
  }
}
