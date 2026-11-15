import { describe, expect, it } from "vitest";
import en from "../src/i18n/en.json";
import es from "../src/i18n/es.json";
import simEn from "../src/i18n/sim.en.json";
import { SCENARIOS } from "../src/features/simulation/scenarios";

type Tree = { [key: string]: unknown };

function keys(obj: Tree, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === "object" && !Array.isArray(v) ? keys(v as Tree, path) : [path];
  });
}

describe("i18n", () => {
  it("es.json y en.json tienen exactamente las mismas claves", () => {
    expect(keys(en).sort()).toEqual(keys(es).sort());
  });

  it("ninguna traducción está vacía", () => {
    const empty = (o: Tree): boolean =>
      Object.values(o).some((v) =>
        typeof v === "string" ? v.trim() === "" : v && typeof v === "object" ? empty(v as Tree) : false,
      );
    expect(empty(es)).toBe(false);
    expect(empty(en)).toBe(false);
  });
});

describe("i18n: claves usadas en el código", () => {
  it("cada t(\"clave\") literal de src/ existe en es.json", () => {
    // Vite carga el código fuente como texto (sin depender de node:fs).
    const sources = import.meta.glob("../src/**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }) as Record<
      string,
      string
    >;
    const flat = new Set(keys(es));
    const missing: string[] = [];
    for (const [file, code] of Object.entries(sources)) {
      for (const m of code.matchAll(/\bt\("([\w.]+)"/g)) {
        const k = m[1];
        // también vale una clave que apunta a una lista u objeto (returnObjects)
        if (!flat.has(k) && ![...flat].some((x) => x.startsWith(k + "."))) missing.push(`${file}: ${k}`);
      }
    }
    expect(Object.keys(sources).length).toBeGreaterThan(20);
    expect(missing).toEqual([]);
  });
});

describe("i18n: textos de los escenarios de demo", () => {
  it("cada texto visible de los escenarios tiene traducción al inglés", () => {
    const texts = Object.values(SCENARIOS).flatMap((s) => [
      s.summary,
      ...s.recommendations,
      ...s.schedule.map((b) => b.label),
      ...s.alertLog.flatMap((e) => [e.title, e.detail]),
    ]);
    const missing = [...new Set(texts)].filter((x) => !(x in simEn));
    expect(missing).toEqual([]);
  });
});
