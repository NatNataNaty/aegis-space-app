import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { createBrowserRouter, Navigate, useParams } from "react-router-dom";
import { ControlPage } from "../components/control/ControlPage";
import { EmergencyPage } from "../components/emergency/EmergencyPage";
import { NotFoundPage } from "../components/layout/NotFoundPage";
import { ProtocolPage } from "../components/protocols/ProtocolPage";
import { isLang, setLanguage } from "../i18n";
import { App } from "./App";
import { RootLayout } from "./RootLayout";

/** Rutas públicas de la app. Los enlaces de las alertas usan protocolPath(). */
export const ROUTES = {
  panel: "/",
  emergency: "/emergencia",
  control: "/control",
} as const;

export const protocolPath = (id: string, lang: string) => `/${lang}/protocolos/${encodeURIComponent(id)}`;

/** /:lang/protocolos/:id → fija el idioma desde la URL y muestra el protocolo. */
function LangProtocolRoute() {
  const { lang } = useParams();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (isLang(lang) && lang !== i18n.language) setLanguage(lang);
  }, [lang, i18n.language]);

  if (!isLang(lang)) return <NotFoundPage />;
  return <ProtocolPage />;
}

/** /protocolos/:id (sin idioma) → redirige al idioma actual. */
function ProtocolRedirect() {
  const { id = "" } = useParams();
  const { i18n } = useTranslation();
  return <Navigate to={protocolPath(id, i18n.language)} replace />;
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: ROUTES.panel, element: <App /> },
      { path: "/:lang/protocolos/:id", element: <LangProtocolRoute /> },
      { path: "/protocolos/:id", element: <ProtocolRedirect /> },
      { path: ROUTES.emergency, element: <EmergencyPage /> },
      { path: ROUTES.control, element: <ControlPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
