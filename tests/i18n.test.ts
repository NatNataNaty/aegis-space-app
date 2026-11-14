import { describe, expect, it } from "vitest";
import en from "../src/i18n/en.json";
import es from "../src/i18n/es.json";

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
