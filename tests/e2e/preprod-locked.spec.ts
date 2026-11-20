import { expect, request as pwRequest, test } from "@playwright/test";
import { accessToken } from "../../src/lib/preview-access";

/** Préproduction SANS code d'accès configuré : le site doit rester entièrement fermé (503). */
test.describe("préproduction verrouillée (code absent)", () => {
  for (const path of ["/", "/series", "/series/sang-royal", "/api/series/sang-royal/feed", "/maquettes/videos/poster-1.jpg", "/__preprod/acces"]) {
    test(`${path} → fermé (503), aucun contenu`, async ({ baseURL }) => {
      const ctx = await pwRequest.newContext({ baseURL, maxRedirects: 0 });
      const res = await ctx.get(path);
      expect(res.status()).toBe(503);
      expect(res.headers()["x-robots-tag"]).toContain("noindex");
      const body = await res.text();
      expect(body).toContain("n'est pas encore configurée");
      expect(body).not.toMatch(/Sang Royal|499|demo-\d/);
      await ctx.dispose();
    });
  }

  test("aucun code ne permet d'entrer, même un cookie fabriqué", async ({ baseURL }) => {
    const ctx = await pwRequest.newContext({ baseURL, maxRedirects: 0, extraHTTPHeaders: { Cookie: `agodjie_preprod=${await accessToken("un-code-quelconque-de-16-caracteres")}` } });
    expect((await ctx.get("/series")).status()).toBe(503);
    expect((await ctx.post("/__preprod/acces", { form: { code: "", next: "/" } })).status()).toBe(503);
    await ctx.dispose();
  });
});
