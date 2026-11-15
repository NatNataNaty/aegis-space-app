import { Outlet } from "react-router-dom";
import { BuddyAlarm } from "../components/alerts/BuddyAlarm";
import { HelpOverlay } from "../components/alerts/HelpOverlay";
import { HelpStatus } from "../components/alerts/HelpStatus";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { VaultLock } from "../components/layout/VaultLock";
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
  return (
    <>
      <ErrorBoundary name="help">
        <HelpStatus />
        <HelpOverlay />
        <BuddyAlarm />
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
