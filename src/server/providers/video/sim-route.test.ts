import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/sim-video/[token]/[expires]/[videoId]/[file]/route";
import { getVideoProvider, getVideoSimulator, simulatorSecret } from "./index";

const SECRET = "secret-de-test-pour-le-simulateur-0123";

function call(url: string) {
  const [, , token, expires, videoId, file] = url.split("/");
  return GET(new Request(`http://localhost${url}`), { params: Promise.resolve({ token: token!, expires: expires!, videoId: videoId!, file: file! }) });
}

afterEach(() => vi.unstubAllEnvs());

describe("CDN du simulateur vidéo", () => {
  it("sert la playlist et les segments avec un jeton valide", async () => {
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("VIDEO_PROVIDER", "simulator");
    vi.stubEnv("SIMULATOR_SIGNING_SECRET", SECRET);
    const { url } = await getVideoSimulator()!.createPlaybackUrl("demo-1", { validitySeconds: 300 });
    const playlist = await call(url);
    expect(playlist.status).toBe(200);
    expect(playlist.headers.get("content-type")).toBe("application/vnd.apple.mpegurl");
    expect(await playlist.text()).toContain("h264-720p.m3u8");
    const segment = await call(url.replace("playlist.m3u8", "h264-360p-00.m4s"));
    expect(segment.status).toBe(200);
  });

  it("refuse un jeton expiré, falsifié ou utilisé pour une autre vidéo", async () => {
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("SIMULATOR_SIGNING_SECRET", SECRET);
    const sim = getVideoSimulator()!;
    const past = await sim.createPlaybackUrl("demo-1", { validitySeconds: 10, now: new Date(Date.now() - 60_000) });
    expect((await call(past.url)).status).toBe(403);
    const { url } = await sim.createPlaybackUrl("demo-1", { validitySeconds: 300 });
    expect((await call(url.replace("demo-1", "demo-2"))).status).toBe(403);
    expect((await call(url.replace(/\/[0-9a-f]{64}\//, `/${"0".repeat(64)}/`))).status).toBe(403);
  });

  it("refuse les noms de fichiers hors liste (pas de remontée de dossier)", async () => {
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("SIMULATOR_SIGNING_SECRET", SECRET);
    const { url } = await getVideoSimulator()!.createPlaybackUrl("demo-1", { validitySeconds: 300 });
    expect((await call(url.replace("playlist.m3u8", "..%2F..%2Fpackage.json"))).status).toBe(404);
  });

  it("PRODUCTION : le simulateur est refusé et la route ne sert rien (SEC-44)", async () => {
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("SIMULATOR_SIGNING_SECRET", SECRET);
    const { url } = await getVideoSimulator()!.createPlaybackUrl("demo-1", { validitySeconds: 300 });
    vi.stubEnv("APP_ENV", "production");
    expect(() => getVideoProvider()).toThrow(/production/);
    expect((await call(url)).status).toBe(404);
  });

  it("préproduction sans secret configuré : refus (aucun secret par défaut dans le dépôt)", () => {
    expect(() => simulatorSecret({ APP_ENV: "preview" })).toThrow(/obligatoire en préproduction/);
    expect(simulatorSecret({ APP_ENV: "preview", SIMULATOR_SIGNING_SECRET: SECRET })).toBe(SECRET);
    expect(simulatorSecret({ APP_ENV: "development" })).toMatch(/^[0-9a-f]{64}$/);
  });

  it("un fournisseur réel non encore branché est signalé clairement", () => {
    expect(() => getVideoProvider({ APP_ENV: "development", VIDEO_PROVIDER: "bunny" })).toThrow(/non disponible : bunny/);
  });
});
