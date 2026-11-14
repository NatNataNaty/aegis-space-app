import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { loadPref, savePref } from "../lib/storage";
import en from "./en.json";
import es from "./es.json";

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
  resources: { es: { translation: es }, en: { translation: en } },
  lng: initialLang(),
  fallbackLng: "es",
  interpolation: { escapeValue: false }, // React ya escapa el contenido
  returnNull: false,
});

const syncHtmlLang = (lng: string) => {
  if (typeof document !== "undefined") document.documentElement.lang = lng;
};
syncHtmlLang(i18n.language);

export function setLanguage(lng: Lang): void {
  void i18n.changeLanguage(lng);
  savePref(LANG_KEY, lng);
  syncHtmlLang(lng);
}

export default i18n;
