import type { AlertLevel } from "./alert.types";

export type Light = "green" | "yellow" | "red";

/** El nivel del motor de alertas se traduce a un semáforo: verde sigue, amarillo vigila, rojo actúa. */
export function lightFor(level: AlertLevel | null): Light {
  if (level === "attention") return "red";
  if (level === "watch") return "yellow";
  return "green";
}
