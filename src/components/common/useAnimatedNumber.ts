import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Anima un número desde su valor anterior hasta el nuevo (cuenta hacia arriba o hacia abajo).
 * Con "reducir movimiento" activado devuelve el valor final directamente.
 */
export function useAnimatedNumber(target: number | null, durationMs = 900): number | null {
  const [value, setValue] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    if (target === null || from.current === null || prefersReducedMotion()) {
      from.current = target;
      setValue(target);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(origin + (target - origin) * eased);
      if (t < 1) raf = requestAnimationFrame(step);
      else from.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      from.current = target;
    };
  }, [target, durationMs]);

  return value;
}
