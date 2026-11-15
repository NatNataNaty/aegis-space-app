import { beforeEach, describe, expect, it } from "vitest";
import type { Alert } from "../src/features/alerts/alert.types";
import { useHealthStore } from "../src/stores/health.store";

const alert = (id: string, protocolId: string | null = null) =>
  ({ id, level: "attention", title: id, observed: id, protocolId, signals: [] }) as unknown as Alert;

describe("alertas atendidas", () => {
  beforeEach(() => useHealthStore.setState({ activeAlerts: [], rawAlerts: [], attended: {}, alertLog: [] }));

  it("desaparecen al atenderlas aunque el motor siga viéndolas", () => {
    const s = useHealthStore.getState();
    s.setAlerts([alert("a"), alert("b", "agotamiento")], "D1");
    expect(useHealthStore.getState().activeAlerts.map((a) => a.id)).toEqual(["a", "b"]);
    s.attendAlerts((a) => a.protocolId === "agotamiento");
    expect(useHealthStore.getState().activeAlerts.map((a) => a.id)).toEqual(["a"]);
    s.setAlerts([alert("a"), alert("b", "agotamiento")], "D1");
    expect(useHealthStore.getState().activeAlerts.map((a) => a.id)).toEqual(["a"]);
  });
});
