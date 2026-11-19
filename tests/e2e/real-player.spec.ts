import { expect, test, type Page } from "@playwright/test";

/**
 * Lecteur RÉEL, étape L1 : écrans de la maquette V2 alimentés par la base, flux HLS signé
 * (simulateur vidéo, local/préproduction), épisodes gratuits seulement. Nécessite DATABASE_URL avec
 * les données de démonstration (npm run db:migrate -- --demo).
 */

async function openSeries(page: Page) {
  await page.goto("/series/sang-royal");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function enterPlayer(page: Page) {
  await openSeries(page);
  await page.getByTestId("enter-player").click();
  await expect(page.getByTestId("vertical-feed")).toBeVisible();
}

async function waitPlaying(page: Page, minTime = 0.5) {
  await page.waitForFunction(
    (t) => {
      const v = document.querySelector<HTMLVideoElement>("[data-testid=active-video]");
      return Boolean(v && v.currentTime > t && !v.paused && v.videoWidth > 0);
    },
    minTime,
    { timeout: 20_000 },
  );
}

async function goToSlide(page: Page, index: number) {
  await page.evaluate((i) => {
    const el = document.querySelector<HTMLElement>("[data-testid=feed-scroller]")!;
    el.scrollTo({ top: i * el.clientHeight });
  }, index);
}

test.describe("site réel — catalogue et fiche série depuis la base", () => {
  test("le catalogue affiche les séries de la base ; une série « bientôt » l'annonce", async ({ page }) => {
    await page.goto("/series");
    const catalog = page.getByTestId("catalog");
    await expect(catalog.getByText("Sang Royal")).toBeVisible();
    await expect(catalog.getByText("Bientôt")).toHaveCount(5);
    await catalog.getByRole("button", { name: /Fleuve Noir/ }).click();
    await expect(page.getByRole("status")).toHaveText("« Fleuve Noir » arrive bientôt sur Agodjié TV.");
    await catalog.getByRole("button", { name: /Sang Royal/ }).click();
    await expect(page).toHaveURL(/\/series\/sang-royal$/);
  });

  test("fiche série : données réelles, prix 499 FCFA / Pass 1 500 FCFA, aucun réglage de maquette", async ({ page }) => {
    await openSeries(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sang Royal");
    await expect(page.getByTestId("series-meta")).toHaveText("6 épisodes · 9 min 19 au total · 1 à venir · épisodes 1 et 2 gratuits");
    await expect(page.getByTestId("offer-pass")).toContainText("1 500 FCFA");
    await expect(page.getByTestId("pass-saving")).toHaveText("Économisez 496 FCFA + les prochains épisodes");
    await expect(page.getByTestId("offer-episode")).toContainText("499 FCFA");
    const list = page.getByTestId("episode-list");
    await expect(list.locator("li")).toHaveCount(7);
    await expect(list).not.toContainText("Le Retour"); // brouillon : jamais affiché
    await expect(page.getByText("Réglages de la maquette")).toHaveCount(0);
    await expect(page.getByTestId("enter-player")).toHaveText("Regarder l'épisode 1 — Gratuit");
  });

  test("achat : aucune simulation de paiement sur le site réel (achats pas encore ouverts)", async ({ page }) => {
    await openSeries(page);
    await page.getByTestId("offer-pass").click();
    const sheet = page.getByTestId("purchase-unavailable");
    await expect(sheet).toContainText("Les achats ouvriront très bientôt");
    await expect(sheet.getByRole("button", { name: /Payer/ })).toHaveCount(0);
  });
});

test.describe("lecteur réel — flux HLS signé", () => {
  test("l'épisode 1 gratuit se lit en HLS via un lien signé ; l'épisode suivant est préchargé légèrement", async ({ page }) => {
    const files: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/sim-video/")) files.push(r.url());
    });
    await enterPlayer(page);
    await waitPlaying(page, 1);
    await expect(page.getByTestId("feed-title")).toContainText("Sang Royal · Épisode 1 / 6");
    expect(files.some((u) => /\/sim-video\/[0-9a-f]{64}\/\d+\/demo-1\/playlist\.m3u8$/.test(u))).toBe(true);
    expect(files.some((u) => /\/demo-1\/(h264|vp9)-\d+p-00\.m4s$/.test(u))).toBe(true);
    // Préchargement : uniquement le début de l'épisode 2
    const ep2Segments = files.filter((u) => /\/demo-2\/.*-\d\d\.m4s$/.test(u));
    expect(ep2Segments.length).toBeLessThanOrEqual(2);
  });

  test("enchaînement automatique 1 → 2, puis arrêt devant l'épisode 3 payant (aucun lien demandé)", async ({ page }) => {
    const playbackCalls: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/api/playback/")) playbackCalls.push(r.url());
    });
    await enterPlayer(page);
    await waitPlaying(page);
    await page.evaluate(() => {
      const v = document.querySelector<HTMLVideoElement>("[data-testid=active-video]")!;
      v.currentTime = v.duration - 0.3;
    });
    await expect(page.getByTestId("feed-title")).toContainText("Épisode 2", { timeout: 10_000 });
    await waitPlaying(page);
    await page.evaluate(() => {
      const v = document.querySelector<HTMLVideoElement>("[data-testid=active-video]")!;
      v.currentTime = v.duration - 0.3;
    });
    await expect(page.getByTestId("feed-title")).toContainText("Épisode 3", { timeout: 10_000 });
    const ep3 = page.getByRole("region", { name: "Épisode 3" });
    await expect(ep3.getByTestId("locked-slide")).toBeVisible();
    await expect(ep3.locator("video")).toHaveCount(0);
    await expect(ep3.getByRole("button", { name: /Débloquer toute la série — 1\s500\sFCFA/ })).toBeVisible();
    await ep3.getByRole("button", { name: /Seulement cet épisode — 499\sFCFA/ }).click();
    await expect(page.getByTestId("purchase-unavailable")).toBeVisible();
    // Seuls les épisodes 1 et 2 (gratuits) ont reçu un lien de lecture.
    expect(new Set(playbackCalls).size).toBe(2);
  });

  test("lien expiré pendant la lecture : nouveau lien demandé, la lecture continue sans interruption", async ({ page }) => {
    let firstDir: string | null = null;
    let refused = 0;
    await page.route("**/sim-video/**", async (route) => {
      const url = route.request().url();
      const dir = url.slice(0, url.lastIndexOf("/"));
      if (/\/demo-1\//.test(url)) firstDir ??= dir;
      // Simule l'expiration du premier jeton à partir du deuxième segment.
      if (dir === firstDir && /-0[1-3]\.m4s$/.test(url)) {
        refused += 1;
        await route.fulfill({ status: 403, body: "Lien expiré" });
        return;
      }
      await route.continue();
    });
    const renewals: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/api/playback/") && r.postData()?.includes("renew")) renewals.push(r.url());
    });
    await enterPlayer(page);
    const started = Date.now();
    await waitPlaying(page, 6);
    // Sans interruption notable : 6 s de vidéo lues en moins de 10 s (marge pour le démarrage).
    expect(Date.now() - started).toBeLessThan(10_000);
    expect(refused).toBeGreaterThan(0);
    expect(renewals.length).toBeGreaterThan(0);
    await expect(page.getByTestId("playback-error")).toHaveCount(0);
  });

  test("coupure réseau : message clair, puis reprise automatique au retour de la connexion", async ({ page, context }) => {
    await enterPlayer(page);
    await waitPlaying(page);
    await context.setOffline(true);
    await expect(page.getByTestId("playback-error")).toContainText("hors connexion");
    await context.setOffline(false);
    await expect(page.getByTestId("playback-error")).toHaveCount(0);
  });

  test("service de lecture indisponible : message et bouton « Réessayer » qui relance la lecture", async ({ page }) => {
    let fail = true;
    await page.route("**/api/playback/**", async (route) => {
      if (fail) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "unavailable" }) });
      return route.continue();
    });
    await enterPlayer(page);
    const error = page.getByTestId("playback-error");
    await expect(error).toContainText("momentanément indisponible");
    fail = false;
    await error.getByRole("button", { name: "Réessayer" }).click();
    await waitPlaying(page);
  });

  test("reprise : la fiche propose de reprendre là où l'on s'est arrêté", async ({ page }) => {
    await enterPlayer(page);
    await waitPlaying(page, 4);
    await page.getByRole("button", { name: "Retour à la série" }).click();
    await expect(page.getByTestId("enter-player")).toHaveText(/^Reprendre — Épisode 1 à 0:0\d$/);
    await page.getByTestId("enter-player").click();
    await expect(page.getByRole("status")).toContainText("Reprise à");
    await waitPlaying(page, 4);
  });

  test("fin de série : autres séries de la base et retour au catalogue", async ({ page }) => {
    await enterPlayer(page);
    await goToSlide(page, 7);
    const end = page.getByTestId("series-end-slide");
    await expect(end).toBeVisible();
    await expect(end).toContainText("Nuits de Cotonou");
    await expect(end).not.toContainText(/saison/i);
    await end.getByRole("button", { name: "Retour au catalogue" }).click();
    await expect(page.getByTestId("catalog")).toBeVisible();
  });
});

test.describe("sécurité de la lecture (API)", () => {
  test("aucun identifiant vidéo dans les données envoyées au navigateur", async ({ page, request }) => {
    const feed = await request.get("/api/series/sang-royal/feed");
    expect(feed.ok()).toBe(true);
    expect(await feed.text()).not.toMatch(/demo-\d|video_?id/i);
    await openSeries(page);
    expect(await page.content()).not.toMatch(/demo-\d|video_?id/i);
  });

  test("épisode payant : aucun lien ; requête d'un autre site : refusée ; jeton falsifié : refusé", async ({ request, baseURL }) => {
    const feed = await (await request.get("/api/series/sang-royal/feed")).json();
    const paid = feed.series.episodes.find((e: { number: number }) => e.number === 3).id;
    const free = feed.series.episodes.find((e: { number: number }) => e.number === 1).id;

    const locked = await request.post(`/api/playback/${paid}`, { data: { purpose: "start" }, headers: { Origin: baseURL! } });
    expect(locked.status()).toBe(403);
    expect(await locked.json()).toEqual({ error: "locked", message: "Cet épisode n'est pas débloqué." });

    const crossSite = await request.post(`/api/playback/${free}`, { data: { purpose: "start" }, headers: { Origin: "https://pirate.example" } });
    expect(crossSite.status()).toBe(403);

    const ok = await request.post(`/api/playback/${free}`, { data: { purpose: "start" }, headers: { Origin: baseURL! } });
    expect(ok.status()).toBe(200);
    const { url, expiresAt } = await ok.json();
    expect(new Date(expiresAt).getTime() - Date.now()).toBeGreaterThan(290_000);
    expect(new Date(expiresAt).getTime() - Date.now()).toBeLessThanOrEqual(300_000);
    expect((await request.get(url)).status()).toBe(200);
    expect((await request.get(url.replace(/\/[0-9a-f]{64}\//, `/${"a".repeat(64)}/`))).status()).toBe(403);
    expect((await request.get(url.replace("/demo-1/", "/demo-3/"))).status()).toBe(403);
  });
});
