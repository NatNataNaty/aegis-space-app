import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * La app debe funcionar entera sin red. Cualquier petición fuera de localhost se bloquea
 * y hace fallar la prueba (salvo Supabase, que es el único tráfico permitido y aquí no está configurado).
 */
async function blockNetwork(page: Page): Promise<string[]> {
  const external: string[] = [];
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "localhost" || url.protocol === "data:" || url.protocol === "blob:") return route.continue();
    external.push(url.href);
    return route.abort("internetdisconnected");
  });
  return external;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {
      /* sin almacenamiento */
    }
  });
});

test("el panel, la biblioteca y los protocolos funcionan sin ninguna petición externa", async ({ page }) => {
  const external = await blockNetwork(page);
  await page.goto("/");
  await expect(page.locator("#hero-title")).toBeVisible();
  await page.locator(".rail__item").nth(4).click();
  await expect(page.locator(".hazard")).toHaveCount(5);
  await expect(page.locator(".risk")).toHaveCount(17);
  await page.goto("/es/protocolos/frecuencia-cardiaca");
  await page.getByRole("button", { name: "Sí, puedo hacerlo solo" }).click();
  await page.getByRole("button", { name: "Hecho" }).first().click();
  await expect(page.locator(".step--done")).toHaveCount(1);
  expect(external).toEqual([]);
});

test("flujo de demo: alerta → ¿Necesitas ayuda? → compañero confirma → protocolo", async ({ context }) => {
  const crew = await context.newPage();
  const buddy = await context.newPage();
  const external = [...(await blockNetwork(crew)), ...(await blockNetwork(buddy))];
  await crew.goto("/");
  await buddy.goto("/");
  await crew.locator(".scenario select").selectOption("physio_variation");
  await expect(crew.getByRole("alertdialog")).toBeVisible();
  await expect(buddy.locator(".help--buddy")).toBeVisible();
  await buddy.locator(".help--buddy .help__btn").first().click();
  await expect(buddy).toHaveURL(/protocolos\/.+modo=companero/);
  await expect(crew.locator(".help-status")).toContainText(/viene en camino|on their way/);
  await crew.locator(".help .help__btn").first().click();
  await expect(crew).toHaveURL(/protocolos\//);
  expect(external).toEqual([]);
});

test("modo emergencia: alto contraste, accesible y protocolo en ≤ 3 toques", async ({ page }) => {
  await blockNetwork(page);
  await page.goto("/");
  await page.locator(".rail__emergency").click(); // 1
  await expect(page).toHaveURL(/emergencia/);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
  await page.locator(".emergency__item").first().click(); // 2
  await page.getByRole("button", { name: /puedo hacerlo solo|I can do it alone/ }).click(); // 3
  await expect(page.locator(".step--current")).toBeVisible();
});

test("sin scroll horizontal en ninguna pantalla", async ({ page }) => {
  await blockNetwork(page);
  for (const url of ["/", "/emergencia", "/control", "/es/protocolos/no-responde"]) {
    await page.goto(url);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, url).toBeLessThanOrEqual(0);
  }
});
