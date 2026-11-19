import { expect, test, type Page } from "@playwright/test";

/** Maquette du lecteur vertical en défilement continu (PRODUCT_REQUIREMENTS §5). Paiements simulés. */

async function enter(page: Page) {
  await page.goto("/maquettes/lecteur");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId("enter-player").click();
  await expect(page.getByTestId("vertical-feed")).toBeVisible();
}

async function waitPlaying(page: Page) {
  await page.waitForFunction(() => {
    const v = document.querySelector<HTMLVideoElement>("[data-testid=active-video]");
    return Boolean(v && v.currentTime > 0.3 && !v.paused);
  });
}

async function finishCurrentEpisode(page: Page) {
  await page.evaluate(() => {
    const v = document.querySelector<HTMLVideoElement>("[data-testid=active-video]")!;
    v.currentTime = Math.max(0, v.duration - 0.2);
  });
}

async function goToSlide(page: Page, index: number) {
  await page.evaluate((i) => {
    const el = document.querySelector<HTMLElement>("[data-testid=feed-scroller]")!;
    el.scrollTo({ top: i * el.clientHeight });
  }, index);
}

test.describe("lecteur vertical — maquette", () => {
  test("entrée dans le lecteur : lecture immédiate de l'épisode 1, titre discret", async ({ page }) => {
    await enter(page);
    await waitPlaying(page);
    await expect(page.getByTestId("feed-title")).toContainText("Sang Royal · S1 · Épisode 1");
  });

  test("glisser (flèche bas) passe à l'épisode suivant, flèche haut revient", async ({ page }) => {
    await enter(page);
    await waitPlaying(page);
    await page.keyboard.press("ArrowDown");
    await expect(page.getByTestId("feed-title")).toContainText("Épisode 2");
    await page.keyboard.press("ArrowUp");
    await expect(page.getByTestId("feed-title")).toContainText("Épisode 1");
  });

  test("enchaînement automatique à la fin d'un épisode", async ({ page }) => {
    await enter(page);
    await waitPlaying(page);
    await finishCurrentEpisode(page);
    await expect(page.getByTestId("feed-title")).toContainText("Épisode 2");
    await waitPlaying(page);
  });

  test("s'arrête devant un épisode payant : aucune lecture automatique, offre claire", async ({ page }) => {
    await enter(page);
    await goToSlide(page, 1);
    await expect(page.getByTestId("feed-title")).toContainText("Épisode 2");
    await waitPlaying(page);
    await finishCurrentEpisode(page);
    await expect(page.getByTestId("feed-title")).toContainText("Épisode 3");
    const locked = page.getByRole("region", { name: "Épisode 3" }).getByTestId("locked-slide");
    await expect(locked).toBeVisible();
    await expect(locked.getByRole("button", { name: /Débloquer la saison/ })).toBeVisible();
    await expect(page.getByRole("region", { name: "Épisode 3" }).locator("video")).toHaveCount(0);
  });

  test("le pass saison débloque l'épisode et les suivants, sans nouveau paiement", async ({ page }) => {
    await enter(page);
    await goToSlide(page, 2);
    await page.getByRole("region", { name: "Épisode 3" }).getByRole("button", { name: /Débloquer la saison/ }).click();
    await page.getByRole("button", { name: /Payer avec Mobile Money/ }).click();
    await page.getByRole("button", { name: "Regarder maintenant" }).click();
    await waitPlaying(page);
    await expect(page.getByTestId("feed-title")).toContainText("Épisode 3");
    for (const n of [4, 5, 6]) {
      await page.keyboard.press("ArrowDown");
      await expect(page.getByTestId("feed-title")).toContainText(`Épisode ${n}`);
      await expect(page.getByRole("region", { name: `Épisode ${n}` }).getByTestId("locked-slide")).toHaveCount(0);
    }
  });

  test("épisode acheté à l'unité : seul celui-ci est débloqué", async ({ page }) => {
    await enter(page);
    await goToSlide(page, 2);
    await page.getByRole("region", { name: "Épisode 3" }).getByRole("button", { name: /Seulement cet épisode/ }).click();
    await page.getByRole("button", { name: /Payer avec Mobile Money/ }).click();
    await page.getByRole("button", { name: "Regarder maintenant" }).click();
    await waitPlaying(page);
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("region", { name: "Épisode 4" }).getByTestId("locked-slide")).toBeVisible();
  });

  test("épisode programmé : annoncé, jamais lisible", async ({ page }) => {
    await enter(page);
    await goToSlide(page, 6);
    await expect(page.getByTestId("scheduled-slide")).toBeVisible();
    await expect(page.getByRole("region", { name: "Épisode 7" }).locator("video")).toHaveCount(0);
  });

  test("fin de saison avec pass : la saison 2 n'est pas présentée comme incluse", async ({ page }) => {
    await page.goto("/maquettes/lecteur");
    await page.getByRole("button", { name: "Pass saison 1" }).click();
    await page.getByTestId("enter-player").click();
    await goToSlide(page, 7);
    await expect(page.getByTestId("season-end-slide")).toBeVisible();
    await expect(page.getByTestId("pass-scope-notice")).toHaveText("Votre pass Saison 1 ne couvre pas la saison 2.");
    await expect(page.getByRole("button", { name: /Débloquer la saison 2/ })).toBeVisible();
  });

  test("reprise : la fiche propose de reprendre le dernier épisode regardé", async ({ page }) => {
    await enter(page);
    await goToSlide(page, 1);
    await waitPlaying(page);
    await page.waitForFunction(() => document.querySelector<HTMLVideoElement>("[data-testid=active-video]")!.currentTime > 3.2);
    await page.getByRole("button", { name: "Retour à la série" }).click();
    await expect(page.getByTestId("enter-player")).toContainText("Reprendre — Épisode 2 à 0:0");
  });

  test("série horizontale : vidéo entière, jamais déformée ni recadrée", async ({ page }) => {
    await page.goto("/maquettes/lecteur");
    await page.getByRole("button", { name: "Horizontal 16:9" }).click();
    await page.getByTestId("enter-player").click();
    await waitPlaying(page);
    const fit = await page.getByTestId("active-video").evaluate((v) => getComputedStyle(v).objectFit);
    expect(fit).toBe("contain");
  });

  test("le panneau « Épisodes » permet de sauter à un épisode", async ({ page }) => {
    await enter(page);
    await waitPlaying(page);
    await page.getByRole("button", { name: "Liste des épisodes" }).click();
    await page.getByTestId("episodes-sheet").getByRole("button", { name: /Le Conseil/ }).click();
    await expect(page.getByTestId("feed-title")).toContainText("Épisode 6");
  });
});
