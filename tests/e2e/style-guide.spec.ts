import { expect, test } from "@playwright/test";

test.describe("guide de style (étape 1)", () => {
  test("affiche l'identité : bannière, cartes, boutons, couleurs", async ({ page }) => {
    await page.goto("/guide-de-style");
    await expect(page.getByRole("heading", { level: 1, name: "Sang Royal" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Regarder l'épisode 1/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cartes de séries" })).toBeVisible();
    await expect(page.getByText("Bientôt", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("499 FCFA").first()).toBeVisible();
    await expect(page.getByText("Identité provisoire.")).toBeVisible();
  });

  test("thème sombre par défaut, thème clair mémorisé après rechargement", async ({ page }) => {
    await page.goto("/guide-de-style");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const bgDark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.getByTestId("theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    const bgLight = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bgLight).not.toBe(bgDark);
  });

  test("aucun défilement horizontal, même sur un petit téléphone (360 px)", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 760 });
    await page.goto("/guide-de-style");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("les polices de la marque sont chargées (Figtree, Roboto)", async ({ page }) => {
    await page.goto("/guide-de-style");
    await page.evaluate(() => document.fonts.ready);
    // On vérifie que des fichiers de police ont réellement été chargés (document.fonts.check seul ne suffit pas :
    // il renvoie « vrai » pour une police inconnue).
    const families = await page.evaluate(() =>
      [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, "")),
    );
    expect(families).toContain("Figtree Variable");
    expect(families).toContain("Roboto");
    const titleFont = await page.getByRole("heading", { level: 1 }).evaluate((el) => getComputedStyle(el).fontFamily);
    expect(titleFont).toContain("Figtree");
  });

  test("en-têtes de sécurité présents", async ({ request }) => {
    const res = await request.get("/");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
    expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    expect(res.headers()["x-powered-by"]).toBeUndefined();
  });
});
