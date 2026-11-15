import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { BuddyAlarm } from "../components/alerts/BuddyAlarm";
import { HelpOverlay } from "../components/alerts/HelpOverlay";
import { HelpStatus } from "../components/alerts/HelpStatus";
import { ShipAlarm } from "../components/alerts/ShipAlarm";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { VaultLock } from "../components/layout/VaultLock";
import { startEarthLink } from "../features/link/earthReports";
import { Starfield } from "../components/space/Starfield";
import { useAppEngine } from "../hooks/useAppEngine";
import { useHelpWatcher } from "../hooks/useHelpWatcher";

/**
 * Raíz de todas las rutas. El motor (reloj de misión, simulación y alertas) y el aviso
 * «¿Necesitas ayuda?» viven aquí para que sigan funcionando en el panel, en un protocolo,
 * en emergencia o en /control.
 */
export function RootLayout() {
  useAppEngine();
  useHelpWatcher();
  // Reportes de cada tripulante hacia la Tierra: se guardan a bordo y salen cuando hay enlace.
  useEffect(() => startEarthLink(), []);
  // Precarga el modelo de visión (local, sin red) para que la cámara analice en cuanto se encienda.
  useEffect(() => {
    if (navigator.webdriver) return; // las pruebas automáticas no usan la cámara
    const id = window.setTimeout(() => {
      void import("../features/camera/faceLandmarker.service")
        .then((m) => m.getFaceLandmarker())
        .catch(() => undefined);
    }, 2000);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <>
      <Starfield />
      <ErrorBoundary name="help">
        <HelpStatus />
        <HelpOverlay />
        <BuddyAlarm />
        <ShipAlarm />
      </ErrorBoundary>
      <ErrorBoundary name="vault">
        <VaultLock />
      </ErrorBoundary>
      <ErrorBoundary name="page">
        <Outlet />
      </ErrorBoundary>
    </>
  );
}
