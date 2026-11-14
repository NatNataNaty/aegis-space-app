import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { OriginBadge } from "../common/OriginBadge";

export function AboutDataDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="about-title"
    >
      <div className="dialog__inner">
        <header className="dialog__head">
          <h2 id="about-title">Acerca de los datos</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <section className="about-row">
          <OriginBadge origin="camera_live" />
          <p>
            Cámara web real y modelo MediaPipe Face Landmarker ejecutado en este navegador: detección del rostro, estado
            de los ojos, parpadeos, duración de cierres y PERCLOS. Los frames solo existen en memoria; no se graban, no se
            suben y no se almacenan.
          </p>
        </section>
        <section className="about-row">
          <OriginBadge origin="simulated" />
          <p>
            Frecuencia cardíaca, SpO₂, presión arterial, temperatura, respiración, glucosa, sueño, radiación, ejercicio,
            horario e históricos. Se generan de forma determinista según el escenario elegido. No son datos de astronautas
            reales.
          </p>
        </section>
        <section className="about-row">
          <OriginBadge origin="user_reported" />
          <p>Respuestas del cuestionario de fatiga, ánimo, estrés y síntomas que introduces tú.</p>
        </section>
        <section className="about-row">
          <OriginBadge origin="local_test" />
          <p>Resultado de la prueba de tiempo de reacción realizada en este dispositivo.</p>
        </section>

        <div className="about-limits">
          <h3>Límites</h3>
          <ul>
            <li>Prototipo educativo de apoyo a la observación. No es un dispositivo médico y no diagnostica.</li>
            <li>No deduce emociones, estrés, depresión ni enfermedades a partir del rostro.</li>
            <li>La cámara no mide sueño, SpO₂, presión arterial, temperatura ni glucosa.</li>
            <li>Los umbrales del detector son parámetros experimentales, no límites médicos oficiales de NASA.</li>
            <li>Si no hay rostro o la calidad es insuficiente, el dato se muestra como «No disponible», nunca como cero.</li>
          </ul>
        </div>
      </div>
    </dialog>
  );
}
