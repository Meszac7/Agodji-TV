import { describe, expect, it } from "vitest";
import { VideoSimulator } from "./video/simulator";

describe("simulateur vidéo (liens signés)", () => {
  const video = new VideoSimulator("secret-video-de-test-0123456789");
  const now = new Date("2026-11-19T10:00:00Z");

  function parse(url: string) {
    const u = new URL(url, "http://localhost");
    return { token: u.searchParams.get("token")!, expires: Number(u.searchParams.get("expires")) };
  }

  it("un lien valide est accepté avant expiration", async () => {
    const { url } = await video.createPlaybackUrl("demo-3", { validitySeconds: 300, now });
    const { token, expires } = parse(url);
    expect(video.verify("demo-3", token, expires, new Date(now.getTime() + 60_000))).toBe(true);
  });
  it("un lien copié est refusé après expiration", async () => {
    const { url } = await video.createPlaybackUrl("demo-3", { validitySeconds: 300, now });
    const { token, expires } = parse(url);
    expect(video.verify("demo-3", token, expires, new Date(now.getTime() + 301_000))).toBe(false);
  });
  it("un jeton ne fonctionne pas pour un autre épisode", async () => {
    const { url } = await video.createPlaybackUrl("demo-3", { validitySeconds: 300, now });
    const { token, expires } = parse(url);
    expect(video.verify("demo-4", token, expires, now)).toBe(false);
  });
  it("prolonger soi-même l'expiration invalide le lien", async () => {
    const { url } = await video.createPlaybackUrl("demo-3", { validitySeconds: 300, now });
    const { token, expires } = parse(url);
    expect(video.verify("demo-3", token, expires + 3600, now)).toBe(false);
  });
  it("refuse une durée de validité déraisonnable et un secret trop court", async () => {
    await expect(video.createPlaybackUrl("x", { validitySeconds: 86400 })).rejects.toThrow(RangeError);
    expect(() => new VideoSimulator("court")).toThrow();
  });
});
