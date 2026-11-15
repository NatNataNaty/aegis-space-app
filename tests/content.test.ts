import { describe, expect, it } from "vitest";
import { contentIntegrityErrors, HAZARDS, PROTOCOLS, RISKS } from "../src/lib/content";

describe("contenido empaquetado (/content)", () => {
  it("tiene los 5 peligros RIDGE en orden", () => {
    expect(HAZARDS.map((h) => h.letter).join("")).toBe("RIDGE");
  });

  it("tiene los 17 riesgos de NASA HRP: 11 de fisiología, 5 de conducta y 1 de radiación", () => {
    const count = (c: string) => RISKS.filter((r) => r.category === c).length;
    expect([count("physiology"), count("behavior"), count("radiation")]).toEqual([11, 5, 1]);
  });

  it("tiene los 11 protocolos (10 del plan + dolor de pecho) y todos siguen pendientes de revisión médica", () => {
    expect(PROTOCOLS).toHaveLength(11);
    for (const p of PROTOCOLS) {
      expect(p.reviewStatus).toBe("pendiente");
      for (const s of [...p.solo, ...p.withBuddy]) expect(s.reviewStatus).toBe("pendiente");
    }
  });

  it("ningún paso de protocolo contiene dosis ni fármacos", () => {
    const text = JSON.stringify(PROTOCOLS).toLowerCase();
    expect(text).not.toMatch(/\d\s?(mg|ml|mcg|µg|ui)\b|dosis de|dose of|administra|administer/);
  });

  it("las referencias cruzadas entre archivos son válidas", () => {
    expect(contentIntegrityErrors()).toEqual([]);
  });
});
