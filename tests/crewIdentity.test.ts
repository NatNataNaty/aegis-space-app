import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { CREW, crewById, useCrewStore } from "../src/data/crew";
import { bestCrewMatch, CREW_MATCH } from "../src/features/identity/identity.store";

describe("tripulación reconocida automáticamente", () => {
  it("la tripulación ficticia tiene 4 personas con escenarios distintos y compañero válido", () => {
    expect(CREW).toHaveLength(4);
    expect(new Set(CREW.map((c) => c.scenarioId)).size).toBe(4);
    for (const c of CREW) expect(crewById(c.buddyId)).toBeDefined();
  });

  it("elige al tripulante cuya huella más se parece", () => {
    const a = Array.from({ length: 153 }, (_, i) => 1 + (i % 7) * 0.1);
    const b = a.map((v, i) => v + (i % 2 ? 0.2 : -0.2));
    const live = a.map((v) => v + 0.005);
    const best = bestCrewMatch(live, { "AR1-001": b, "AR1-002": a });
    expect(best?.id).toBe("AR1-002");
    expect(best!.score).toBeGreaterThanOrEqual(CREW_MATCH);
    expect(bestCrewMatch(live, {})).toBeNull();
  });

  it("cambiar de tripulante activo ignora ids que no existen", () => {
    useCrewStore.getState().setActive("AR1-004");
    expect(useCrewStore.getState().activeId).toBe("AR1-004");
    useCrewStore.getState().setActive("XX-999");
    expect(useCrewStore.getState().activeId).toBe("AR1-004");
  });
});

describe("flujo automático con la cámara", () => {
  const face = (seed: number, jitter = 0) => {
    const pts = Array.from({ length: 478 }, (_, i) => ({
      x: 0.3 + ((i * (37 + seed)) % 100) / 250 + jitter * Math.sin(i),
      y: 0.2 + ((i * (53 + seed * 3)) % 100) / 200 + jitter * Math.cos(i),
      z: ((i * 11) % 20) / 1000,
    }));
    pts[33] = { x: 0.35, y: 0.4, z: 0 };
    pts[263] = { x: 0.65, y: 0.4, z: 0 };
    return pts;
  };

  it("rostro nuevo → siguiente tripulante; se va → bloquea; vuelve → lo reconoce", async () => {
    const { vi } = await import("vitest");
    const { ocularSession } = await import("../src/features/camera/ocularSession");
    const { useIdentityStore } = await import("../src/features/identity/identity.store");
    let feed: ((l: unknown) => void) | null = null;
    vi.spyOn(ocularSession, "onLandmarks").mockImplementation((fn) => {
      feed = fn as (l: unknown) => void;
      return () => {
        feed = null;
      };
    });
    vi.useFakeTimers({ toFake: ["Date"] });
    const id = useIdentityStore.getState();
    await id.forgetAll();
    id.startAuto();
    const settle = async () => {
      for (let i = 0; i < 20; i++) await Promise.resolve();
      await new Promise((r) => setTimeout(r, 0));
    };
    const show = async (seed: number) => {
      for (let i = 0; i < 15; i++) feed!(face(seed, 0.0005 * (i % 3)));
      await vi.waitFor(() => expect(["matched", "newcrew"]).toContain(useIdentityStore.getState().phase));
      await settle();
    };
    const leave = () => {
      vi.setSystemTime(Date.now() + 4000);
      feed!(null);
    };

    await show(0);
    const first = useIdentityStore.getState().matchedId;
    expect(useIdentityStore.getState().phase).toBe("newcrew");
    expect(first).toBe(CREW[0].id);
    expect(useCrewStore.getState().activeId).toBe(first);

    leave();
    expect(useIdentityStore.getState().phase).toBe("watching");
    expect(useIdentityStore.getState().matchedId).toBeNull();

    await show(9);
    expect(useIdentityStore.getState().matchedId).toBe(CREW[1].id);

    leave();
    await show(0);
    expect(useIdentityStore.getState().phase).toBe("matched");
    expect(useIdentityStore.getState().matchedId).toBe(first);

    useIdentityStore.getState().stopAuto();
    vi.useRealTimers();
  });
});
