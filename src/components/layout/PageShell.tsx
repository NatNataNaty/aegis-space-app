import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { LanguageSwitch } from "./LanguageSwitch";

/** Marco común para las páginas fuera del panel (protocolo, emergencia, control). */
export function PageShell({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="app page">
      <header className="topbar">
        <Link to="/" className="btn btn--ghost">
          <ArrowLeft size={15} aria-hidden />
          <span className="btn__label">{t("nav.back")}</span>
        </Link>
        <h1 className="page__title">{title}</h1>
        <div className="topbar__actions">
          <LanguageSwitch />
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
