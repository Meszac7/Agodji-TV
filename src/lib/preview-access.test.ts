import { describe, expect, it } from "vitest";
import {
  accessMode,
  accessPageHtml,
  accessToken,
  isPreviewEnv,
  isValidAccessCookie,
  isValidCode,
  safeNextPath,
} from "./preview-access";

const CODE = "phrase-de-test-assez-longue";

describe("préproduction : règle d'accès (fermée par défaut)", () => {
  it("développement et tests : ouvert ; production : public", () => {
    expect(accessMode({ APP_ENV: "development" })).toBe("open");
    expect(accessMode({ APP_ENV: "test" })).toBe("open");
    expect(accessMode({ APP_ENV: "production" })).toBe("public");
  });

  it("préproduction avec code : protégée", () => {
    expect(accessMode({ APP_ENV: "preview", PREVIEW_ACCESS_CODE: CODE })).toBe("protected");
  });

  it("code absent, vide ou trop court : VERROUILLÉE", () => {
    expect(accessMode({ APP_ENV: "preview" })).toBe("locked");
    expect(accessMode({ APP_ENV: "preview", PREVIEW_ACCESS_CODE: "" })).toBe("locked");
    expect(accessMode({ APP_ENV: "preview", PREVIEW_ACCESS_CODE: "trop-court" })).toBe("locked");
  });

  it("APP_ENV oublié ou mal écrit : jamais ouvert par erreur", () => {
    expect(accessMode({})).toBe("locked");
    expect(accessMode({ APP_ENV: "Production" })).toBe("locked");
    expect(accessMode({ APP_ENV: "prod", PREVIEW_ACCESS_CODE: CODE })).toBe("protected");
  });

  it("mention « Préproduction » partout sauf en développement et en production", () => {
    expect(isPreviewEnv({ APP_ENV: "preview", PREVIEW_ACCESS_CODE: CODE })).toBe(true);
    expect(isPreviewEnv({})).toBe(true);
    expect(isPreviewEnv({ APP_ENV: "production" })).toBe(false);
    expect(isPreviewEnv({ APP_ENV: "development" })).toBe(false);
  });
});

describe("préproduction : code et cookie d'accès", () => {
  it("bon code accepté, mauvais code refusé", async () => {
    expect(await isValidCode(CODE, CODE)).toBe(true);
    expect(await isValidCode(CODE + "x", CODE)).toBe(false);
    expect(await isValidCode("", CODE)).toBe(false);
    expect(await isValidCode("x".repeat(600), CODE)).toBe(false);
  });

  it("le cookie ne contient pas le code ; un cookie inventé est refusé", async () => {
    const token = await accessToken(CODE);
    expect(token).not.toContain(CODE);
    expect(await isValidAccessCookie(token, CODE)).toBe(true);
    expect(await isValidAccessCookie(undefined, CODE)).toBe(false);
    expect(await isValidAccessCookie("1", CODE)).toBe(false);
    expect(await isValidAccessCookie(token.slice(0, -1) + (token.endsWith("A") ? "B" : "A"), CODE)).toBe(false);
  });

  it("changer le code invalide immédiatement les cookies existants", async () => {
    const old = await accessToken(CODE);
    expect(await isValidAccessCookie(old, CODE + "-nouveau")).toBe(false);
  });

  it("après saisie du code, retour uniquement vers une page du site (pas de redirection externe)", () => {
    expect(safeNextPath("/series/sang-royal?x=1")).toBe("/series/sang-royal?x=1");
    expect(safeNextPath("//pirate.example")).toBe("/");
    expect(safeNextPath("/\\pirate.example")).toBe("/");
    expect(safeNextPath("https://pirate.example")).toBe("/");
    expect(safeNextPath("/__preprod/acces")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
  });

  it("la page d'accès échappe la destination (pas d'injection de code)", () => {
    const html = accessPageHtml({ next: '/"><script>alert(1)</script>' });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("noindex");
  });
});
