import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

/**
 * Independencia total de la Tierra: la app se instala una vez y desde entonces
 * funciona en modo avión, incluso al recargar o abrirla de nuevo.
 */

const ROUTES = ["/", "/emergencia", "/control", "/es/protocolos/dolor-pecho-respirar", "/en/protocolos/falta-oxigeno"];

/** Cualquier petición fuera de localhost hace fallar la prueba. */
function watchExternal(context: BrowserContext): string[] {
  const external: string[] = [];
  context.on("request", (req) => {
    const url = new URL(req.url());
    if (!["localhost", "127.0.0.1"].includes(url.hostname) && !["data:", "blob:"].includes(url.protocol)) external.push(url.href);
  });
  return external;
}

/** Primera visita con red local: el service worker precachea toda la app (modelos y WASM incluidos). */
async function installApp(page: Page) {
  await page.goto("/");
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true }));
    }
    return reg.active?.state;
  });
  await page.reload();
  await expect(page.locator("#hero-title")).toBeVisible();
}

test.use({ locale: "es-ES" });

test.describe("independencia de la Tierra", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "service worker en Chromium");

  test("en modo avión, todas las pantallas cargan desde la caché tras recargar", async ({ page, context }) => {
    const external = watchExternal(context);
    await installApp(page);
    await context.setOffline(true);

    for (const route of ROUTES) {
      await page.goto(route);
      await expect(page.locator("h1, h2").first()).toBeVisible();
      await expect(page.locator("body")).not.toContainText("ERR_INTERNET_DISCONNECTED");
    }
    // El modelo de la cámara y su WASM también están en la caché.
    const cached = await page.evaluate(async () => {
      const keys = (await Promise.all((await caches.keys()).map(async (k) => (await caches.open(k)).keys()))).flat().map((r) => r.url);
      return { model: keys.some((u) => u.includes(".task")), wasm: keys.some((u) => u.includes(".wasm")) };
    });
    expect(cached).toEqual({ model: true, wasm: true });
    expect(external).toEqual([]);
  });

  test("en modo avión: medir, ver el semáforo, pedir ayuda y abrir un protocolo", async ({ page, context }) => {
    const external = watchExternal(context);
    await installApp(page);
    await context.setOffline(true);
    await page.reload();

    // Semáforo visible en verde al empezar.
    await expect(page.locator(".triage--green")).toBeVisible();

    // Registrar una medición a mano (teclado).
    await page.locator(".rail__item").nth(2).click();
    await page.getByLabel("Presión sistólica en mmHg").fill("118");
    await page.getByLabel("Presión diastólica en mmHg").fill("76");
    await page.getByLabel("Glucosa en mg/dL").fill("97");
    await page.getByRole("button", { name: "Guardar medición" }).click();
    await expect(page.locator(".measure__history li")).toHaveCount(1);

    // Marcar dolor de pecho → rojo inmediato con su protocolo.
    await page.getByText("Dolor u opresión en el pecho").click();
    await page.getByRole("button", { name: "Registrar", exact: true }).click();
    // Dolor de pecho: aviso inmediato → suena la alarma de la nave; alguien acude.
    await expect(page.locator(".ship-alarm")).toBeVisible();
    await page.getByRole("button", { name: "Voy a ayudar" }).click();
    await expect(page.locator(".ship-alarm")).toHaveCount(0);
    await expect(page).toHaveURL(/dolor-pecho-respirar/);
    await expect(page.locator(".step").first()).toBeVisible();

    // La medición se ve en «Tu cuerpo ahora» marcada como «a mano».
    await page.goto("/");
    const help = page.locator(".help button").filter({ hasText: "bien" });
    if (await help.count()) await help.first().click();
    await expect(page.locator(".body-card__manual").first()).toBeVisible();

    // Los reportes quedan en cola a bordo para la Tierra.
    await page.goto("/control");
    await expect(page.locator(".report-status--pending").first()).toBeVisible();
    await expect(page.getByText("Medición a mano").first()).toBeVisible();

    expect(external).toEqual([]);
  });

  test("ninguna pantalla enlaza fuera de la app y todas pasan accesibilidad", async ({ page, context }) => {
    const external = watchExternal(context);
    for (const route of ROUTES) {
      await page.goto(route);
      await page.waitForTimeout(300);
      const help = page.locator(".help button").filter({ hasText: /bien|OK/ });
      if (await help.count()) await help.first().click();
      await expect(page.locator('a[href^="http"]')).toHaveCount(0);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(results.violations.map((v) => `${route}: ${v.id}`)).toEqual([]);
    }
    expect(external).toEqual([]);
  });
});

test("el paso «manual médico» lleva al manual de a bordo y «Cómo me siento» al registro", async ({ page, context }) => {
  const external = watchExternal(context);
  await page.goto("/es/protocolos/agotamiento");
  await page.getByRole("button", { name: "Sí, puedo hacerlo solo" }).click();
  await page.getByRole("link", { name: /Abrir en el manual de a bordo/ }).first().click();
  await expect(page).toHaveURL(/\/es\/manual\/agotamiento/);
  await expect(page.getByRole("heading", { name: /Señales de alarma/ })).toBeVisible();
  await expect(page.locator(".manual__do li")).toHaveCount(4);
  await page.goto("/es/protocolos/frecuencia-cardiaca");
  await page.getByRole("button", { name: "Sí, puedo hacerlo solo" }).click();
  // Avanza hasta el paso que remite a «Cómo me siento».
  await page.getByRole("button", { name: "Hecho" }).first().click();
  await page.getByRole("button", { name: "Hecho" }).first().click();
  await page.getByRole("link", { name: /Abrir «¿Cómo me siento\?»/ }).first().click();
  await expect(page.getByRole("button", { name: "Guardar medición" })).toBeVisible();
  expect(external).toEqual([]);
});
