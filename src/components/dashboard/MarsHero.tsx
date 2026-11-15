import { useTranslation } from "react-i18next";
import { fmtNum } from "../../lib/format";
import { useHealthStore } from "../../stores/health.store";
import { confidence, useBaselineStore } from "../../features/baseline/personalBaseline";
import { useAnimatedNumber } from "../common/useAnimatedNumber";

export type HeroMood = "calm" | "watch" | "alert";

/** Estado general que tiñe el paisaje: tranquilo (azul), seguimiento (ámbar suave), alerta (ámbar fuerte). */
export function useHeroMood(): HeroMood {
  const hrStatus = useHealthStore((s) => s.snapshot.vitals.heartRate.status);
  // Selectores con valores simples (no listas nuevas): evitan renders infinitos con Zustand 5.
  const hasAttention = useHealthStore((s) => s.activeAlerts.some((a) => a.level === "attention"));
  const hasWatch = useHealthStore((s) => s.activeAlerts.some((a) => a.level === "watch"));
  if (hrStatus === "variation" || hasAttention) return "alert";
  if (hrStatus === "watch" || hasWatch) return "watch";
  return "calm";
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = Math.max(1, max - min);
  const w = 260;
  const h = 64;
  const d = points
    .map((v, i) => `${i === 0 ? "M" : "L"}${((i / (points.length - 1)) * w).toFixed(1)},${(h - 6 - ((v - min) / span) * (h - 12)).toFixed(1)}`)
    .join(" ");
  // key = la forma: al cambiar los datos, la línea se vuelve a dibujar.
  return (
    <svg className="mars-hero__spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <path key={d} d={d} pathLength={1} className="mars-hero__spark-line" />
    </svg>
  );
}

export function MarsHero() {
  const { t } = useTranslation();
  const mood = useHeroMood();
  const hr = useHealthStore((s) => s.snapshot.vitals.heartRate.value);
  const history = useHealthStore((s) => s.snapshot.history24h);
  const trend7d = useHealthStore((s) => s.snapshot.trend7d);
  const hrStatus = useHealthStore((s) => s.snapshot.vitals.heartRate.status);
  const topAlert = useHealthStore((s) => s.activeAlerts.find((a) => a.level !== "info"));

  // «Lo normal para ti»: lo que la línea base aprendió de ti; si aún no hay lecturas, la media de 7 días.
  const learned = useBaselineStore((st) => st.stats.heartRate);
  const conf = confidence(learned);
  const baseline =
    learned.n > 0
      ? Math.round(learned.mean)
      : trend7d.length
        ? Math.round(trend7d.reduce((a, d) => a + d.restingHr, 0) / trend7d.length)
        : null;
  const shown = useAnimatedNumber(hr);

  // El titular solo refleja el estado ya calculado (heartRate.status) y las alertas activas:
  // aquí no se aplica ningún umbral clínico propio.
  const headline =
    mood === "alert"
      ? hrStatus === "variation"
        ? t("hero.headline.hrVariation")
        : (topAlert?.title ?? t("hero.headline.alert"))
      : mood === "watch"
        ? t("hero.headline.watch")
        : t("hero.headline.calm");

  return (
    <section className={`mars-hero mars-hero--${mood}`} aria-labelledby="hero-title">
      <svg className="mars-hero__scene" viewBox="0 0 800 600" preserveAspectRatio="xMidYMax slice" aria-hidden>
        <defs>
          <radialGradient id="mars-halo" cx="0.62" cy="0.62" r="0.55">
            <stop offset="0" className="mars-hero__halo-core" />
            <stop offset="0.14" className="mars-hero__halo-mid" />
            <stop offset="0.5" className="mars-hero__halo-edge" />
            <stop offset="1" stopColor="#22141b" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="800" height="600" fill="url(#mars-halo)" className="mars-hero__sky" />
        <circle cx="496" cy="372" r="15" className="mars-hero__sun" />
        <line x1="0" y1="0" x2="60" y2="18" className="mars-hero__meteor" />
        <g className="mars-hero__satellite">
          <rect x="-6" y="-1.5" width="12" height="3" />
          <rect x="-1.5" y="-2.5" width="3" height="5" />
        </g>
        <g className="mars-hero__dust">
          <circle cx="120" cy="300" r="1.6" />
          <circle cx="260" cy="250" r="1.2" />
          <circle cx="380" cy="330" r="1.4" />
          <circle cx="600" cy="280" r="1.1" />
          <circle cx="700" cy="340" r="1.5" />
        </g>
        <path className="mars-hero__ridge mars-hero__ridge--far" d="M-40 420 C 90 395, 190 410, 300 382 S 490 370, 580 400 S 730 385, 840 370 L 840 600 L -40 600 Z" />
        <path className="mars-hero__ridge mars-hero__ridge--mid" d="M-40 480 C 120 450, 260 490, 390 460 S 640 440, 840 472 L 840 600 L -40 600 Z" />
        <path className="mars-hero__ridge mars-hero__ridge--near" d="M-40 545 C 180 520, 340 555, 540 528 S 740 535, 840 526 L 840 600 L -40 600 Z" />
      </svg>

      <div className="mars-hero__content">
        <h1 id="hero-title" className="mars-hero__title" aria-live="polite">
          {headline}
        </h1>

        <div className="mars-hero__reading">
          <span className="mars-hero__number">{shown === null ? t("common.unavailable") : fmtNum(shown)}</span>
          <span className="mars-hero__unit">
            <span className="mars-hero__unit-main">{t("hero.bpm")}</span>
            {baseline !== null && <span>{t("hero.baseline", { value: baseline })}</span>}
            {conf !== "none" && (
              <span className="mars-hero__learn">{t(`hero.learn.${conf}`, { count: learned.n })}</span>
            )}
          </span>
          <Sparkline points={history.slice(-16).map((p) => p.heartRate)} />
        </div>
      </div>
    </section>
  );
}
