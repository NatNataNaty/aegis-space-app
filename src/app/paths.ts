/** Rutas públicas de la app (sin dependencias, para evitar importaciones circulares). */
export const ROUTES = {
  panel: "/",
  emergency: "/emergencia",
  control: "/control",
} as const;

export const protocolPath = (id: string, lang: string) => `/${lang}/protocolos/${encodeURIComponent(id)}`;
