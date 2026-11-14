import { useTranslation } from "react-i18next";
import { PageShell } from "./PageShell";

export function NotFoundPage() {
  const { t } = useTranslation();
  return <PageShell title={t("pages.notFound.title")}>{null}</PageShell>;
}
