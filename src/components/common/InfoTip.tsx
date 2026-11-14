import { CircleQuestionMark } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { METRIC_INFO, type MetricId } from "../../data/metricCatalog";

export function InfoTip({ metric, align = "right" }: { metric: MetricId; align?: "left" | "right" }) {
  const info = METRIC_INFO[metric];
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <span className="infotip" ref={ref}>
      <button
        type="button"
        className="infotip__btn"
        aria-label={`¿Qué significa ${info.label}?`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <CircleQuestionMark size={14} aria-hidden />
      </button>
      {open && (
        <span role="tooltip" id={id} className={`infotip__pop infotip__pop--${align}`}>
          <strong>{info.label}</strong>
          <span>{info.what}</span>
          {"note" in info && info.note && <em>{info.note}</em>}
        </span>
      )}
    </span>
  );
}
