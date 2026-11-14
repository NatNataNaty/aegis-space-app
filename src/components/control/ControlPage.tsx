import { useTranslation } from "react-i18next";
import { PageShell } from "../layout/PageShell";

// Página de relleno: interfaz del Centro de control. Los datos (Supabase) los conecta P1.
export function ControlPage() {
  const { t } = useTranslation();
  return (
    <PageShell title={t("pages.control.title")}>
      <p>{t("pages.control.pending")}</p>
    </PageShell>
  );
}
