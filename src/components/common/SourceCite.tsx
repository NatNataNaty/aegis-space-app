import { BookMarked } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Dirección legible sin protocolo: «nasa.gov/hrp/risks». */
export function shortUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

/**
 * Cita de fuente 100 % local: solo nombra el organismo, sin enlace ni dirección web.
 * Las direcciones completas están en docs/FUENTES.md. A bordo no hay internet, así que nada en la app abre páginas externas;
 * el contenido citado ya va empaquetado dentro de la app.
 */
export function SourceCite({ label, url }: { label: string; url?: string; compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <cite className="source" title={url ? t("source.offlineHint") : undefined}>
      <BookMarked size={13} aria-hidden />
      <span>
        {t("source.prefix")} {label}
      </span>
      
    </cite>
  );
}
