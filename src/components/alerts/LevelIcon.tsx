import { CircleExclamationPoint, Info, TriangleExclamationPoint } from "lucide-react";
import type { AlertLevel } from "../../features/alerts/alert.types";

export function LevelIcon({ level, size = 16 }: { level: AlertLevel; size?: number }) {
  const Icon = level === "attention" ? TriangleExclamationPoint : level === "watch" ? CircleExclamationPoint : Info;
  return <Icon size={size} className={`level-icon level-icon--${level}`} aria-hidden />;
}
