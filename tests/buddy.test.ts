import { beforeEach, describe, expect, it } from "vitest";
import { readEvents } from "../src/features/protocols/eventLog";
import { useBuddyStore } from "../src/stores/buddy.store";

const base = { alertKey: "sim_vitals:frecuencia-cardiaca", alertId: "sim_vitals", title: "Variación", protocolId: "frecuencia-cardiaca" };

beforeEach(() => {
  useBuddyStore.setState({ prompt: null, outgoing: null, incoming: [], handledAlertKeys: {} });
});

describe("«¿Necesitas ayuda?» y aviso al compañero", () => {
  it("con 30 s abre la pregunta sin avisar todavía", () => {
    useBuddyStore.getState().openPrompt({ ...base, buddyAfterSec: 30 });
    const s = useBuddyStore.getState();
    expect(s.prompt?.autoSent).toBe(false);
    expect(s.outgoing).toBeNull();
  });

  it("con aviso inmediato (0 s) avisa al compañero y mantiene la pregunta a la vista", () => {
    useBuddyStore.getState().openPrompt({ ...base, protocolId: "falta-oxigeno", buddyAfterSec: 0 });
    const s = useBuddyStore.getState();
    expect(s.prompt?.autoSent).toBe(true);
    expect(s.outgoing?.call.immediate).toBe(true);
    expect(s.outgoing?.call.protocolId).toBe("falta-oxigeno");
  });

  it("«Estoy bien» tras un aviso inmediato cancela el aviso", () => {
    useBuddyStore.getState().openPrompt({ ...base, buddyAfterSec: 0 });
    useBuddyStore.getState().answerOk();
    expect(useBuddyStore.getState().outgoing).toBeNull();
    expect(useBuddyStore.getState().prompt).toBeNull();
  });

  it("«Necesito ayuda» envía el aviso con el protocolo de la alerta", () => {
    useBuddyStore.getState().openPrompt({ ...base, buddyAfterSec: 30 });
    useBuddyStore.getState().askForHelp(false, "Especialista");
    const out = useBuddyStore.getState().outgoing;
    expect(out?.call.auto).toBe(false);
    expect(out?.call.protocolId).toBe("frecuencia-cardiaca");
    expect(out?.acknowledgedAt).toBeNull();
  });

  it("no vuelve a preguntar por la misma alerta aunque cambie de nivel", () => {
    const store = useBuddyStore.getState();
    store.openPrompt({ ...base, buddyAfterSec: 30 });
    store.answerOk();
    useBuddyStore.getState().forgetAlertKeys([]); // la alerta oscila y desaparece un momento
    useBuddyStore.getState().openPrompt({ ...base, buddyAfterSec: 30 });
    expect(useBuddyStore.getState().prompt).toBeNull();
  });

  it("cada paso queda en el registro local", async () => {
    useBuddyStore.getState().openPrompt({ ...base, buddyAfterSec: 30 });
    useBuddyStore.getState().askForHelp(true, "Especialista");
    await new Promise((r) => setTimeout(r, 20));
    const kinds = (await readEvents()).map((e) => e.kind);
    expect(kinds).toContain("help_prompt");
    expect(kinds).toContain("help_auto_sent");
  });
});
