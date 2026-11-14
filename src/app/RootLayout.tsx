import { Outlet } from "react-router-dom";
import { useAppEngine } from "../hooks/useAppEngine";

/**
 * Raíz de todas las rutas. El motor (reloj de misión, simulación y alertas) vive aquí
 * para que siga funcionando al pasar del panel a un protocolo, a emergencia o a /control.
 */
export function RootLayout() {
  useAppEngine();
  return <Outlet />;
}
