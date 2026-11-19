import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { getCatalog, getSeriesFeed } from "../../src/server/catalog/series-feed";
import { SlidingWindowLimiter } from "../../src/server/playback/rate-limit";
import { authorizePlayback } from "../../src/server/playback/service";
import { VideoSimulator } from "../../src/server/providers/video/simulator";
import { connect, inRollback } from "./helpers";

let db: Client;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

const video = new VideoSimulator("secret-video-de-test-0123456789");
const limiters = () => ({ start: new SlidingWindowLimiter(60), refresh: new SlidingWindowLimiter(400) });

async function episodeId(number: number): Promise<string> {
  const { rows } = await db.query(
    `SELECT e.id FROM app.episodes e JOIN app.series s ON s.id = e.series_id WHERE s.slug = 'sang-royal' AND e.number = $1`,
    [number],
  );
  return rows[0].id;
}
const play = async (id: string, extra: Partial<Parameters<typeof authorizePlayback>[3]> = {}) =>
  authorizePlayback(db, video, limiters(), { episodeId: id, purpose: "start", clientKey: "test", customerId: null, ...extra });

describe("flux public d'une série (fiche + lecteur)", () => {
  it("renvoie les épisodes visibles dans l'ordre : 6 publiés + 1 programmé, jamais le brouillon", async () => {
    const feed = (await getSeriesFeed(db, "sang-royal"))!;
    expect(feed.series.episodes.map((e) => [e.number, e.status, e.access])).toEqual([
      [1, "published", "free"],
      [2, "published", "free"],
      [3, "published", "paid"],
      [4, "published", "paid"],
      [5, "published", "paid"],
      [6, "published", "paid"],
      [7, "scheduled", "paid"],
    ]);
    expect(feed.series.episodes[6]!.publishAt).toBeTruthy();
  });

  it("ne contient JAMAIS d'identifiant vidéo", async () => {
    const json = JSON.stringify(await getSeriesFeed(db, "sang-royal"));
    expect(json).not.toMatch(/demo-\d|video_id|videoId/);
  });

  it("prix du pays d'affichage par défaut (Bénin, XOF) : 499 FCFA l'épisode, Pass de la série", async () => {
    const feed = (await getSeriesFeed(db, "sang-royal"))!;
    expect(feed.displayCountry).toEqual({ code: "BJ", name: "Bénin" });
    expect(feed.currency).toBe("XOF");
    expect(feed.prices!.pass).toBe(1500);
    expect(Object.values(feed.prices!.episodes)).toEqual([499, 499, 499, 499, 499]);
    expect(Object.keys(feed.prices!.episodes)).toContain(await episodeId(7));
  });

  it("pays sans prix (grille vide) : aucun prix inventé, pas de conversion", async () => {
    const { rows } = await db.query(`SELECT country_code FROM app.markets WHERE price_list_id IS NOT NULL AND price_list_id <> (SELECT id FROM app.price_lists WHERE code = 'XOF') LIMIT 1`);
    const feed = (await getSeriesFeed(db, "sang-royal", { countryCode: rows[0].country_code }))!;
    expect(feed.prices).toBeNull();
  });

  it("une série « bientôt » ou inconnue n'a pas de fiche lisible", async () => {
    expect(await getSeriesFeed(db, "nuits-de-cotonou")).toBeNull();
    expect(await getSeriesFeed(db, "n-existe-pas")).toBeNull();
  });

  it("autres séries proposées en fin de série, catalogue complet", async () => {
    const feed = (await getSeriesFeed(db, "sang-royal"))!;
    expect(feed.otherSeries.map((s) => s.slug)).toEqual(["nuits-de-cotonou", "le-marche-des-promesses", "heritage", "fleuve-noir", "les-epouses"]);
    expect(feed.otherSeries.every((s) => !s.available)).toBe(true);
    expect((await getCatalog(db)).length).toBe(6);
  });

  it("un épisode programmé dont la date est passée devient publié", async () => {
    await inRollback(db, async () => {
      await db.query(`UPDATE app.episodes SET publish_at = now() - interval '1 minute' WHERE id = $1`, [await episodeId(7)]);
      const feed = (await getSeriesFeed(db, "sang-royal"))!;
      expect(feed.series.episodes[6]).toMatchObject({ number: 7, status: "published" });
    });
  });
});

describe("droit de lecture (has_episode_access) et lien signé", () => {
  it("épisode gratuit publié : lien signé de 5 minutes (réglage en base)", async () => {
    const now = new Date("2026-11-19T10:00:00Z");
    const d = await play(await episodeId(1), { now });
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.url).toMatch(/^\/sim-video\/[0-9a-f]{64}\/\d+\/demo-1\/playlist\.m3u8$/);
    expect(new Date(d.expiresAt).getTime() - now.getTime()).toBe(300_000);
  });

  it("épisode payant sans achat : refusé (aucun lien)", async () => {
    expect(await play(await episodeId(3))).toEqual({ ok: false, reason: "locked" });
  });

  it("épisode programmé non sorti et brouillon : « introuvable », jamais de lien", async () => {
    expect(await play(await episodeId(7))).toEqual({ ok: false, reason: "not_found" });
    expect(await play(await episodeId(8))).toEqual({ ok: false, reason: "not_found" });
  });

  it("épisode gratuit d'une série dépubliée : refusé", async () => {
    await inRollback(db, async () => {
      await db.query(`UPDATE app.series SET status = 'unpublished' WHERE slug = 'sang-royal'`);
      expect(await play(await episodeId(1))).toEqual({ ok: false, reason: "not_found" });
    });
  });

  it("vidéo pas encore prête : pas de lien", async () => {
    await inRollback(db, async () => {
      await db.query(`UPDATE app.episodes SET video_status = 'processing' WHERE id = $1`, [await episodeId(2)]);
      expect(await play(await episodeId(2))).toEqual({ ok: false, reason: "not_ready" });
    });
  });

  it("limites séparées : nouvelles lectures vs renouvellements (SEC-54)", async () => {
    const l = { start: new SlidingWindowLimiter(2), refresh: new SlidingWindowLimiter(3) };
    const id = await episodeId(1);
    const call = (purpose: "start" | "renew") => authorizePlayback(db, video, l, { episodeId: id, purpose, clientKey: "ip-1", customerId: null });
    expect((await call("start")).ok).toBe(true);
    expect((await call("start")).ok).toBe(true);
    expect(await call("start")).toEqual({ ok: false, reason: "rate_limited" });
    expect((await call("renew")).ok).toBe(true);
  });

  it("has_episode_access : gratuit public seulement (comptes et achats à l'étape L4)", async () => {
    const { rows } = await db.query(
      `SELECT e.number, app.has_episode_access(NULL, e.id) AS ok FROM app.episodes e JOIN app.series s ON s.id = e.series_id WHERE s.slug = 'sang-royal' ORDER BY e.number`,
    );
    expect(rows.map((r) => r.ok)).toEqual([true, true, false, false, false, false, false, false]);
  });
});
