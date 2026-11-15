import { BookMarked } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Dirección legible sin protocolo: «nasa.gov/hrp/risks». */
export function shortUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

/**
 * Cita de fuente 100 % local: nombra el organismo y muestra la dirección como texto,
 * sin enlace. A bordo no hay internet, así que nada en la app abre páginas externas;
 * el contenido citado ya va empaquetado dentro de la app.
 */
export function SourceCite({ label, url, compact = false }: { label: string; url?: string; compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <cite className="source" title={url ? (compact ? `${shortUrl(url)} · ${t("source.offlineHint")}` : t("source.offlineHint")) : undefined}>
      <BookMarked size={13} aria-hidden />
      <span>{label}</span>
      {url && !compact && <span className="source__url">{shortUrl(url)}</span>}
    </cite>
  );
}
