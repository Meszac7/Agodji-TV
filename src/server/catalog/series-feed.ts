import type { SeriesPrices } from "@/lib/player/pricing";
import type { EpisodeInfo, OtherSeries, SeriesInfo } from "@/lib/player/sequencer";

/**
 * Données publiques d'une série pour la fiche et le lecteur.
 * JAMAIS d'identifiant vidéo (video_id) ni de brouillon : seules les règles de la base
 * (is_episode_public, episode_price) décident de ce qui est visible et du prix affiché.
 */
type Db = { query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> };

export type SeriesFeed = {
  slug: string;
  title: string;
  synopsis: string;
  orientation: "portrait" | "landscape";
  poster: string;
  series: SeriesInfo;
  /** Image de chaque épisode (fond flou, diapositives verrouillées). */
  thumbnails: Record<string, string>;
  /** Prix pour le pays d'affichage ; null si la grille de ce pays n'a pas encore de prix. */
  prices: SeriesPrices | null;
  currency: string;
  displayCountry: { code: string; name: string };
  otherSeries: OtherSeries[];
};

export type CatalogEntry = OtherSeries & { tagline: string | null };

const FALLBACK_IMAGE = "/maquettes/videos/poster-1.jpg";

/** Pays d'affichage par défaut (D-21 : Bénin), lu en base. */
async function displayMarket(db: Db, countryCode?: string) {
  const { rows } = await db.query(
    `SELECT m.country_code, m.name, m.price_list_id, pl.currency
       FROM app.markets m LEFT JOIN app.price_lists pl ON pl.id = m.price_list_id
      WHERE m.country_code = COALESCE($1, (SELECT value #>> '{}' FROM app.app_settings WHERE key = 'default_display_country'))`,
    [countryCode ?? null],
  );
  return rows[0] as { country_code: string; name: string; price_list_id: string | null; currency: string | null } | undefined;
}

export async function getCatalog(db: Db): Promise<CatalogEntry[]> {
  const { rows } = await db.query(
    `SELECT id, slug, title, tagline, poster_path, status FROM app.series
      WHERE status IN ('published', 'coming_soon') ORDER BY sort_order, title`,
  );
  return rows.map((r) => ({
    id: String(r.id),
    slug: String(r.slug),
    title: String(r.title),
    tagline: (r.tagline as string | null) ?? null,
    poster: (r.poster_path as string | null) ?? FALLBACK_IMAGE,
    available: r.status === "published",
  }));
}

export async function getSeriesFeed(db: Db, slug: string, options: { countryCode?: string } = {}): Promise<SeriesFeed | null> {
  const { rows: sr } = await db.query(
    `SELECT id, slug, title, synopsis, tagline, video_orientation, poster_path FROM app.series
      WHERE slug = $1 AND status = 'published'`,
    [slug],
  );
  const s = sr[0];
  if (!s) return null;
  const seriesId = String(s.id);

  // Épisodes visibles : publics (règle de la base) ou annoncés avec une date future. Jamais de brouillon.
  const { rows: eps } = await db.query(
    `SELECT e.id, e.number, e.title, e.duration_seconds, e.access_type, e.thumbnail_path,
            app.is_episode_public(e.id) AS is_public, e.publish_at
       FROM app.episodes e
      WHERE e.series_id = $1
        AND (app.is_episode_public(e.id) OR (e.status = 'scheduled' AND e.publish_at > now()))
      ORDER BY e.number`,
    [seriesId],
  );

  const market = await displayMarket(db, options.countryCode);
  const episodes: EpisodeInfo[] = eps.map((e) => ({
    id: String(e.id),
    number: Number(e.number),
    title: String(e.title),
    durationSeconds: Number(e.duration_seconds ?? 0),
    access: e.access_type === "free" ? "free" : "paid",
    status: e.is_public ? "published" : "scheduled",
    ...(e.is_public ? {} : { publishAt: new Date(e.publish_at as string).toISOString() }),
  }));
  const thumbnails = Object.fromEntries(eps.map((e) => [String(e.id), (e.thumbnail_path as string | null) ?? (s.poster_path as string | null) ?? FALLBACK_IMAGE]));

  let prices: SeriesPrices | null = null;
  if (market?.price_list_id) {
    const { rows: pr } = await db.query(
      `SELECT sp.pass_price,
              COALESCE(json_object_agg(e.id, app.episode_price(e.id, $2)) FILTER (WHERE e.access_type = 'paid'), '{}'::json) AS episodes
         FROM app.series_prices sp
         LEFT JOIN app.episodes e ON e.series_id = sp.series_id AND e.id = ANY($3::uuid[])
        WHERE sp.series_id = $1 AND sp.price_list_id = $2
        GROUP BY sp.pass_price`,
      [seriesId, market.price_list_id, episodes.map((e) => e.id)],
    );
    if (pr[0]) prices = { pass: Number(pr[0].pass_price), episodes: pr[0].episodes as Record<string, number> };
  }

  const catalog = await getCatalog(db);
  return {
    slug: String(s.slug),
    title: String(s.title),
    synopsis: String(s.synopsis ?? s.tagline ?? ""),
    orientation: s.video_orientation === "landscape" ? "landscape" : "portrait",
    poster: (s.poster_path as string | null) ?? FALLBACK_IMAGE,
    series: { id: seriesId, title: String(s.title), episodes },
    thumbnails,
    prices,
    currency: market?.currency ?? "XOF",
    displayCountry: { code: market?.country_code ?? "BJ", name: market?.name ?? "Bénin" },
    otherSeries: catalog.filter((c) => c.id !== seriesId).map((c) => ({ id: c.id, slug: c.slug, title: c.title, poster: c.poster, available: c.available })),
  };
}
