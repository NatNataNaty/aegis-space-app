import { describe, expect, it } from "vitest";
import { createVault, openVault, PURPOSE, seal, unseal, WrongPinError } from "../src/lib/db/vaultCrypto";

// Pocas iteraciones solo para que los tests sean rápidos; la app usa PBKDF2_ITERATIONS (600 000).
const FAST = 1_000;

describe("bóveda del registro (PBKDF2 + AES-GCM)", () => {
  it("ida y vuelta: lo cifrado con el PIN correcto se recupera igual", async () => {
    const { record, dataKey } = await createVault("2468", FAST);
    const event = { kind: "protocol_step_done", at: 123, data: { step: "s1" } };
    const sealed = await seal(dataKey, event, PURPOSE.events);
    const reopened = await openVault("2468", record);
    expect(await unseal(reopened, sealed, PURPOSE.events)).toEqual(event);
  });

  it("un PIN incorrecto no abre la bóveda", async () => {
    const { record } = await createVault("2468", FAST);
    await expect(openVault("1357", record)).rejects.toBeInstanceOf(WrongPinError);
  });

  it("no guarda el PIN ni la clave en claro", async () => {
    const { record } = await createVault("24682468", FAST);
    const stored = JSON.stringify(record);
    expect(stored).not.toContain("24682468");
    expect(Object.keys(record).sort()).toEqual(["iterations", "salt", "wrappedKey"]);
  });

  it("cada propósito tiene su additionalData: no se descifra con otro", async () => {
    const { dataKey } = await createVault("2468", FAST);
    const sealed = await seal(dataKey, { a: 1 }, PURPOSE.events);
    await expect(unseal(dataKey, sealed, PURPOSE.dataKey)).rejects.toBeTruthy();
  });

  it("rechaza PIN con formato inválido", async () => {
    await expect(createVault("12", FAST)).rejects.toThrow("invalid_pin");
    await expect(createVault("12ab", FAST)).rejects.toThrow("invalid_pin");
  });

  it("dos bóvedas con el mismo PIN usan sal y clave distintas", async () => {
    const a = await createVault("2468", FAST);
    const b = await createVault("2468", FAST);
    expect(a.record.salt).not.toBe(b.record.salt);
    expect(a.record.wrappedKey.cipher).not.toBe(b.record.wrappedKey.cipher);
  });
});
