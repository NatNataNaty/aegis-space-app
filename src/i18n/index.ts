import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { loadPref, savePref } from "../lib/storage";
import en from "./en.json";
import es from "./es.json";
import simEn from "./sim.en.json";

export const LANGUAGES = ["es", "en"] as const;
export type Lang = (typeof LANGUAGES)[number];

export const isLang = (value: unknown): value is Lang =>
  typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);

const LANG_KEY = "lang";

function initialLang(): Lang {
  const saved = loadPref<unknown>(LANG_KEY, null);
  if (isLang(saved)) return saved;
  const browser = typeof navigator !== "undefined" ? navigator.language.slice(0, 2) : "es";
  return isLang(browser) ? browser : "es";
}

// Todo va empaquetado en la app: sin backend ni carga remota de traducciones (offline-first).
void i18n.use(initReactI18next).init({
  // «sim»: textos de los escenarios de demo. La clave es el texto español (idioma de origen del dato).
  resources: { es: { translation: es, sim: {} }, en: { translation: en, sim: simEn } },
  lng: initialLang(),
  fallbackLng: "es",
  interpolation: { escapeValue: false }, // React ya escapa el contenido
  returnNull: false,
});

const syncHtmlLang = (lng: string) => {
  if (typeof document !== "undefined") document.documentElement.lang = lng;
};
syncHtmlLang(i18n.language);

/** Traduce un texto de los escenarios de demo (el español es la clave y el valor por defecto). */
export const simT = (text: string): string =>
  i18n.t(text, { ns: "sim", keySeparator: false, nsSeparator: false, defaultValue: text });

/** Formato numérico del idioma activo (coma decimal en español, punto en inglés). */
export const fmtLocale = (value: number, digits = 0): string =>
  value.toLocaleString(i18n.language === "en" ? "en-US" : "es-ES", { maximumFractionDigits: digits, minimumFractionDigits: digits });

export function setLanguage(lng: Lang): void {
  void i18n.changeLanguage(lng);
  savePref(LANG_KEY, lng);
  syncHtmlLang(lng);
}

export default i18n;
