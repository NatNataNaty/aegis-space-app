import { useTranslation } from "react-i18next";
import { PageShell } from "../layout/PageShell";

// Página de relleno: aquí irá el modo emergencia (alto contraste, ≤ 3 toques a un protocolo).
export function EmergencyPage() {
  const { t } = useTranslation();
  return (
    <PageShell title={t("pages.emergency.title")}>
      <p>{t("pages.emergency.pending")}</p>
    </PageShell>
  );
}
