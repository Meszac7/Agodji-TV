import { describe, expect, it } from "vitest";
import { needsRenewal, retryDelayMs, rewriteToCurrentGrant, signedDir } from "./stream-url";

describe("moteur de diffusion : renouvellement du lien signé", () => {
  const old = "/sim-video/aaa/100/demo-1/playlist.m3u8";
  const cur = "/sim-video/bbb/400/demo-1/playlist.m3u8";

  it("le dossier signé couvre la playlist et tous les segments", () => {
    expect(signedDir(old)).toBe("/sim-video/aaa/100/demo-1/");
  });

  it("un segment demandé avec l'ancien jeton est réécrit vers le jeton courant", () => {
    const req = "http://localhost:3000/sim-video/aaa/100/demo-1/h264-720p-02.m4s";
    expect(rewriteToCurrentGrant(req, [signedDir(old), signedDir(cur)], signedDir(cur))).toBe(
      "http://localhost:3000/sim-video/bbb/400/demo-1/h264-720p-02.m4s",
    );
  });

  it("une URL déjà à jour ou étrangère n'est pas modifiée", () => {
    const fresh = "http://localhost:3000/sim-video/bbb/400/demo-1/h264-720p-02.m4s";
    expect(rewriteToCurrentGrant(fresh, [signedDir(old), signedDir(cur)], signedDir(cur))).toBe(fresh);
    const other = "http://localhost:3000/autre/fichier.m4s";
    expect(rewriteToCurrentGrant(other, [signedDir(old)], signedDir(cur))).toBe(other);
  });

  it("fonctionne avec des liens absolus (CDN externe)", () => {
    const a = "https://cdn.exemple/bcdn_token=x&expires=1/vid/playlist.m3u8";
    const b = "https://cdn.exemple/bcdn_token=y&expires=2/vid/playlist.m3u8";
    expect(rewriteToCurrentGrant("https://cdn.exemple/bcdn_token=x&expires=1/vid/360p/video0.ts", [signedDir(a)], signedDir(b))).toBe(
      "https://cdn.exemple/bcdn_token=y&expires=2/vid/360p/video0.ts",
    );
  });

  it("renouvelle 30 s avant l'expiration", () => {
    const now = Date.parse("2026-11-19T10:00:00Z");
    expect(needsRenewal("2026-11-19T10:05:00Z", now)).toBe(false);
    expect(needsRenewal("2026-11-19T10:00:25Z", now)).toBe(true);
  });

  it("nouvelles tentatives réseau espacées et plafonnées", () => {
    expect([1, 2, 3, 4, 10].map(retryDelayMs)).toEqual([1000, 2000, 4000, 8000, 15000]);
  });
});
