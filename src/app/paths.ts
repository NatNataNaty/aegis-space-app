/** Rutas públicas de la app (sin dependencias, para evitar importaciones circulares). */
export const ROUTES = {
  panel: "/",
  emergency: "/emergencia",
  control: "/control",
} as const;

export const protocolPath = (id: string, lang: string) => `/${lang}/protocolos/${encodeURIComponent(id)}`;

/** Página del manual médico de a bordo para un protocolo. */
export const manualPath = (id: string, lang: string) => `/${lang}/manual/${encodeURIComponent(id)}`;

/** Panel abierto directamente en un módulo (p. ej. «Cómo me siento»: /?m=log). */
export const modulePath = (module: string) => `/?m=${encodeURIComponent(module)}`;
