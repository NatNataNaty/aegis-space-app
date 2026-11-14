import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { PageShell } from "../layout/PageShell";

// Página de relleno: aquí irá la pantalla paso a paso (bloque 18:30–22:00).
export function ProtocolPage() {
  const { id = "" } = useParams();
  const { t } = useTranslation();
  return (
    <PageShell title={t("pages.protocol.title", { id })}>
      <p className="page__pending">{t("medical.pendingReview")}</p>
      <p>{t("pages.protocol.pending")}</p>
    </PageShell>
  );
}
