/**
 * Cielo de estrellas de fondo: puntos sólidos que titilan despacio y, de vez en cuando,
 * una estrella fugaz. Sin imágenes ni red; posiciones fijas (pseudoaleatorias) para que no salte.
 * Con «reducir movimiento» del sistema queda quieto.
 */
const STARS = Array.from({ length: 150 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 127.1 + n * 311.7) * 43758.5453) % 1 + 1) % 1;
  return { x: r(1) * 100, y: r(2) * 100, s: r(3) < 0.7 ? 1.1 : r(3) < 0.93 ? 1.6 : 2.2, d: (r(4) * 6).toFixed(2), t: (3 + r(5) * 5).toFixed(2) };
});

export function Starfield() {
  return (
    <div className="starfield" aria-hidden>
      <svg width="100%" height="100%" preserveAspectRatio="none">
        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={`${s.x}%`}
            cy={`${s.y}%`}
            r={s.s}
            className="starfield__star"
            style={{ animationDelay: `${s.d}s`, animationDuration: `${s.t}s` }}
          />
        ))}
      </svg>
      <span className="starfield__meteor starfield__meteor--a" />
      <span className="starfield__meteor starfield__meteor--b" />
    </div>
  );
}

/** Marca de aegis: un planeta con un satélite que da vueltas en su órbita. Diseño propio. */
export function AegisMark({ size = 30 }: { size?: number }) {
  return (
    <svg className="aegis-mark" width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <ellipse cx="20" cy="20" rx="17" ry="7" className="aegis-mark__orbit" transform="rotate(-24 20 20)" />
      <circle cx="20" cy="20" r="8.5" className="aegis-mark__planet" />
      <g className="aegis-mark__sat-path">
        <circle cx="37" cy="20" r="2.4" className="aegis-mark__sat" />
      </g>
    </svg>
  );
}
