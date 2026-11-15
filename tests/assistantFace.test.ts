import { describe, expect, it } from "vitest";
import { detectIntent } from "../src/features/assistant/assistant";
import { averageSignature, isMatch, signatureFrom, similarity } from "../src/features/identity/faceSignature";

describe("asistente de a bordo", () => {
  it("reconoce las preguntas frecuentes en ES y EN", () => {
    expect(detectIntent("¿Cómo estoy hoy?")).toBe("today");
    expect(detectIntent("How am I today?")).toBe("today");
    expect(detectIntent("¿Qué significa mi oxígeno en sangre?")).toBe("oxygen");
    expect(detectIntent("¿Cuánta radiación llevo acumulada?")).toBe("radiation");
    expect(detectIntent("¿Por qué importa dormir bien en el viaje a Marte?")).toBe("sleepWhy");
  });

  it("nunca responde sobre fármacos o dosis", () => {
    expect(detectIntent("¿qué dosis de ibuprofeno tomo?")).toBe("unsafe");
    expect(detectIntent("which medication should I take")).toBe("unsafe");
  });

  it("si no sabe, lo dice", () => {
    expect(detectIntent("cuál es la capital de Francia")).toBe("unknown");
  });
});

describe("huella facial", () => {
  // Cara sintética con proporciones realistas: ojos a ~0,3 del encuadre (como frente a una cámara).
  const face = (scaleX = 1, jitter = 0) => {
    const pts = Array.from({ length: 478 }, (_, i) => ({
      x: (0.3 + ((i * 37) % 100) / 250) * scaleX + jitter * Math.sin(i),
      y: 0.2 + ((i * 53) % 100) / 200 + jitter * Math.cos(i),
      z: ((i * 11) % 20) / 1000,
    }));
    pts[33] = { x: 0.35 + jitter, y: 0.4, z: 0 };
    pts[263] = { x: 0.65 - jitter, y: 0.4, z: 0 };
    return pts;
  };

  it("no depende de la distancia a la cámara (escala)", () => {
    const a = signatureFrom(face())!;
    const scaled = signatureFrom(face().map((p) => ({ x: p.x * 2, y: p.y * 2, z: p.z * 2 })))!;
    expect(similarity(a, scaled)).toBeCloseTo(1, 5);
  });

  it("la misma cara con algo de ruido coincide; otra geometría no", () => {
    const enrolled = averageSignature([signatureFrom(face())!, signatureFrom(face(1, 0.001))!])!;
    expect(isMatch(signatureFrom(face(1, 0.002))!, enrolled)).toBe(true);
    expect(isMatch(signatureFrom(face(1.35))!, enrolled)).toBe(false);
  });

  it("sin puntos suficientes no hay huella", () => {
    expect(signatureFrom(null)).toBeNull();
    expect(signatureFrom(face().slice(0, 100))).toBeNull();
  });
});
