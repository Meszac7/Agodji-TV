import { expect, test, type Page } from "@playwright/test";

/** Maquette du lecteur vertical en défilement continu — séries sans saisons, Pass série (PRODUCT_REQUIREMENTS §5). Paiements simulés. */

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
    await expect(page.getByTestId("feed-title")).toContainText("Sang Royal · Épisode 1 / 6");
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
    await expect(locked.getByRole("button", { name: /Débloquer toute la série/ })).toBeVisible();
    await expect(page.getByRole("region", { name: "Épisode 3" }).locator("video")).toHaveCount(0);
  });

  test("le pass série débloque l'épisode et les suivants, reprise automatique, plus aucun paiement", async ({ page }) => {
    await enter(page);
    await goToSlide(page, 2);
    await page.getByRole("region", { name: "Épisode 3" }).getByRole("button", { name: /Débloquer toute la série/ }).click();
    await page.getByRole("button", { name: /Payer avec Mobile Money/ }).click();
    // Reprise automatique après paiement : aucun bouton à toucher.
    await expect(page.getByTestId("purchase-sheet")).toHaveCount(0, { timeout: 8000 });
    await waitPlaying(page);
    await expect(page.getByTestId("feed-title")).toContainText("Épisode 3");
    for (const n of [4, 5, 6]) {
      await page.keyboard.press("ArrowDown");
      await expect(page.getByTestId("feed-title")).toContainText(`Épisode ${n}`);
      await expect(page.getByRole("region", { name: `Épisode ${n}` }).getByTestId("locked-slide")).toHaveCount(0);
    }
    await expect(page.getByTestId("locked-slide")).toHaveCount(0);
  });

  test("épisode acheté à l'unité : seul celui-ci est débloqué", async ({ page }) => {
    await enter(page);
    await goToSlide(page, 2);
    await page.getByRole("region", { name: "Épisode 3" }).getByRole("button", { name: /Seulement cet épisode/ }).click();
    await page.getByRole("button", { name: /Payer avec Mobile Money/ }).click();
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

  test("fin de série : autres séries et retour au catalogue, jamais de saison suivante", async ({ page }) => {
    await page.goto("/maquettes/lecteur");
    await page.getByRole("button", { name: "Pass série", exact: true }).click();
    await page.getByTestId("enter-player").click();
    await goToSlide(page, 7);
    const end = page.getByTestId("series-end-slide");
    await expect(end).toBeVisible();
    await expect(end.getByText("Fin de la série")).toBeVisible();
    await expect(end.getByText("D'autres séries à découvrir")).toBeVisible();
    await expect(end.getByTestId("next-episode-notice")).toContainText("Prochain épisode le");
    await expect(end).not.toContainText(/saison/i);
    await end.getByRole("button", { name: "Retour au catalogue" }).click();
    await expect(page.getByTestId("mock-catalog")).toBeVisible();
  });

  test("avec le pass série, la fiche n'affiche plus aucune proposition d'achat", async ({ page }) => {
    await page.goto("/maquettes/lecteur");
    await page.getByRole("button", { name: "Pass série", exact: true }).click();
    await expect(page.getByTestId("pass-owned")).toBeVisible();
    await expect(page.getByTestId("purchase-options")).toHaveCount(0);
    await expect(page.getByTestId("episode-list")).not.toContainText("FCFA");
  });

  test("la fiche présente les deux achats : Pass au prix de la série avec l'économie, ou 499 FCFA l'épisode", async ({ page }) => {
    await page.goto("/maquettes/lecteur");
    const pass = page.getByTestId("offer-pass");
    await expect(pass).toContainText("1\u00a0500\u00a0FCFA");
    await expect(pass).toContainText("y compris les prochains (1 à venir)");
    // 4 épisodes payants publiés × 499 = 1 996 FCFA ; 1 996 − 1 500 = 496 FCFA d'économie
    await expect(page.getByTestId("pass-saving")).toHaveText("Économisez 496\u00a0FCFA + les prochains épisodes");
    await expect(pass).toContainText("Au lieu de 1\u00a0996\u00a0FCFA pour 4 épisodes à l'unité");
    await expect(page.getByTestId("offer-episode")).toContainText("499\u00a0FCFA");
    await expect(page.getByTestId("episode-list")).toContainText("499\u00a0FCFA");
  });

  test("l'économie tient compte d'un épisode déjà acheté à l'unité", async ({ page }) => {
    await page.goto("/maquettes/lecteur");
    await page.getByRole("button", { name: "Épisode 5 acheté" }).click();
    await expect(page.getByTestId("offer-pass")).toContainText("Au lieu de 1\u00a0497\u00a0FCFA pour 3 épisodes");
    await expect(page.getByTestId("pass-saving")).toHaveCount(0);
  });

  test("acheter le Pass depuis la fiche (paiement simulé) : les offres disparaissent", async ({ page }) => {
    await page.goto("/maquettes/lecteur");
    await page.getByTestId("offer-pass").click();
    const sheet = page.getByTestId("purchase-sheet");
    await expect(sheet).toContainText("1\u00a0500\u00a0FCFA");
    await sheet.getByRole("button", { name: /Payer/ }).click();
    await expect(page.getByTestId("pass-owned")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("purchase-options")).toHaveCount(0);
  });

  test("la fiche affiche le nombre d'épisodes et la durée totale calculée", async ({ page }) => {
    await page.goto("/maquettes/lecteur");
    await expect(page.getByTestId("series-meta")).toContainText("6 épisodes · 9 min 19 au total · 1 à venir");
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
