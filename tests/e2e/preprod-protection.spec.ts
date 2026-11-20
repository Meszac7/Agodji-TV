import { expect, request as pwRequest, test, type APIRequestContext } from "@playwright/test";
import { E2E_PREVIEW_CODE } from "../../playwright.config";

/**
 * Sécurité de la PRÉPRODUCTION (serveur réel, APP_ENV=preview, code d'accès configuré).
 * Objectif : sans authentification, AUCUNE page, donnée, API, vidéo ni fichier du site n'est servi.
 */
const DEMO_DATA = /Sang Royal|Le Pacte|La Couronne|499|1\s?500|demo-\d/;

let anon: APIRequestContext;
test.beforeEach(async ({ baseURL }) => {
  anon = await pwRequest.newContext({ baseURL, maxRedirects: 0 });
});
test.afterEach(async () => {
  await anon.dispose();
});

async function login(page: import("@playwright/test").Page, path = "/series/sang-royal") {
  await page.goto(path);
  await page.getByLabel("Code d'accès").fill(E2E_PREVIEW_CODE);
  await page.getByRole("button", { name: "Entrer" }).click();
}

test.describe("préproduction — sans authentification, rien n'est accessible", () => {
  for (const path of [
    "/",
    "/series",
    "/series/sang-royal",
    "/series/n-existe-pas",
    "/maquettes/lecteur",
    "/guide-de-style",
    "/maquettes/videos/poster-1.jpg",
    "/maquettes/videos/episode-1-vertical.mp4",
    "/favicon.ico",
    `/sim-video/${"a".repeat(64)}/9999999999/demo-1/playlist.m3u8`,
    "/_next/static/chunks/inexistant.js",
  ]) {
    test(`page ou fichier ${path} → page d'accès (401), aucun contenu`, async () => {
      const res = await anon.get(path);
      expect(res.status()).toBe(401);
      expect(res.headers()["content-type"]).toContain("text/html");
      expect(res.headers()["x-robots-tag"]).toContain("noindex");
      // La page d'accès ne fait que rappeler l'adresse demandée (champ « next ») : on l'exclut de la recherche.
      const body = (await res.text()).replace(/value="[^"]*"/g, "");
      expect(body).toContain("accès restreint");
      expect(body).not.toMatch(DEMO_DATA);
    });
  }

  test("API : données de la série et lien de lecture refusés (401)", async ({ baseURL }) => {
    const feed = await anon.get("/api/series/sang-royal/feed");
    expect(feed.status()).toBe(401);
    expect(await feed.json()).toEqual({ error: "preprod_access_required", message: "Accès réservé à la préproduction." });
    const playback = await anon.post("/api/playback/00000000-0000-4000-8000-000000000000", { data: { purpose: "start" }, headers: { Origin: baseURL! } });
    expect(playback.status()).toBe(401);
    expect(await playback.text()).not.toMatch(DEMO_DATA);
  });

  test("les vrais fichiers techniques du site sont eux aussi protégés", async ({ page }) => {
    await login(page);
    const scripts = await page.locator("script[src]").evaluateAll((els) => els.map((e) => (e as HTMLScriptElement).getAttribute("src")!));
    const chunk = scripts.find((s) => s.startsWith("/_next/static/"));
    expect(chunk).toBeTruthy();
    expect((await page.request.get(chunk!)).status()).toBe(200); // avec le cookie
    expect((await anon.get(chunk!)).status()).toBe(401); // sans le cookie
  });

  test("robots.txt interdit toute indexation", async () => {
    const res = await anon.get("/robots.txt");
    expect(res.status()).toBe(200);
    expect(await res.text()).toBe("User-agent: *\nDisallow: /\n");
  });

  test("mauvais code : refusé, aucun cookie d'accès", async () => {
    const res = await anon.post("/__preprod/acces", { form: { code: "mauvais-code-de-test-123", next: "/series" } });
    expect(res.status()).toBe(401);
    expect(res.headers()["set-cookie"] ?? "").not.toContain("agodjie_preprod=");
    expect(await res.text()).toContain("Code incorrect.");
  });

  test("cookie inventé ou ancien : refusé", async ({ baseURL }) => {
    const forged = await pwRequest.newContext({ baseURL, maxRedirects: 0, extraHTTPHeaders: { Cookie: "agodjie_preprod=abc123" } });
    expect((await forged.get("/series")).status()).toBe(401);
    await forged.dispose();
  });

  test("pas de redirection vers un autre site après la saisie du code", async ({ baseURL }) => {
    const res = await anon.post("/__preprod/acces", { form: { code: E2E_PREVIEW_CODE, next: "//pirate.example/vol" } });
    expect(res.status()).toBe(303);
    const location = new URL(res.headers()["location"]!, baseURL);
    expect(location.host).toBe(new URL(baseURL!).host);
    expect(location.pathname).toBe("/");
  });
});

test.describe("préproduction — avec le bon code", () => {
  test("accès à la page demandée, cookie sécurisé, mention « Préproduction » et titre [Préprod]", async ({ page, context }) => {
    await login(page);
    await expect(page).toHaveURL(/\/series\/sang-royal$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sang Royal");
    await expect(page.getByTestId("preprod-banner")).toHaveText("Préproduction · données de démonstration");
    await expect(page).toHaveTitle(/^\[Préprod\] Sang Royal · Agodjié TV$/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    const cookie = (await context.cookies()).find((c) => c.name === "agodjie_preprod")!;
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: "Lax" });
    expect(cookie.value).not.toContain(E2E_PREVIEW_CODE);
    const res = await page.request.get("/series");
    expect(res.headers()["x-robots-tag"]).toContain("noindex");
  });

  test("le lecteur fonctionne derrière la protection (vidéo de démonstration lue)", async ({ page }) => {
    await login(page);
    await page.getByTestId("enter-player").click();
    await page.waitForFunction(() => {
      const v = document.querySelector<HTMLVideoElement>("[data-testid=active-video]");
      return Boolean(v && v.currentTime > 0.5 && !v.paused);
    }, null, { timeout: 20_000 });
    await expect(page.getByTestId("preprod-banner")).toBeVisible();
  });

  test("déconnexion : l'accès est de nouveau refusé", async ({ page }) => {
    await login(page);
    await page.goto("/__preprod/sortie");
    const res = await page.request.get("/series", { maxRedirects: 0 });
    expect(res.status()).toBe(401);
  });
});
