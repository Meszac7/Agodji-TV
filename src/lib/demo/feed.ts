/**
 * Données de la MAQUETTE du lecteur vertical (étape 2). Vidéos de démonstration générées
 * (dégradés animés, sans son) — ni contenu réel ni identité définitive.
 */
import type { NextSeasonInfo, SeasonInfo } from "@/lib/player/sequencer";

export type DemoFeedSeries = {
  slug: string;
  title: string;
  synopsis: string;
  orientation: "portrait" | "landscape";
  season: SeasonInfo;
  nextSeason: NextSeasonInfo | null;
  media: Record<string, { src: string; poster: string }>;
  prices: { episode: number; pass: number; nextPass: number };
};

const titles = ["La Couronne vacante", "Le Pacte", "Les Masques", "La Trahison", "Le Serment", "Le Conseil", "L'Exil"];

function season(seriesTitle: string, prefix: string): SeasonInfo {
  return {
    id: `${prefix}-s1`,
    seriesTitle,
    number: 1,
    episodes: titles.map((title, i) => ({
      id: `${prefix}-e${i + 1}`,
      number: i + 1,
      title,
      durationSeconds: 14,
      access: i < 2 ? ("free" as const) : ("paid" as const),
      status: i < 6 ? ("published" as const) : ("scheduled" as const),
      publishAt: i < 6 ? undefined : "2026-11-26T18:00:00Z",
    })),
  };
}

const BASE = "/maquettes/videos";

export const demoVertical: DemoFeedSeries = {
  slug: "sang-royal",
  title: "Sang Royal",
  synopsis: "Le roi meurt sans désigner d'héritier. Entre alliances et trahisons, deux héritiers se disputent le trône.",
  orientation: "portrait",
  season: season("Sang Royal", "sr"),
  nextSeason: { id: "sr-s2", number: 2, firstEpisodeFree: true },
  media: Object.fromEntries(
    Array.from({ length: 6 }, (_, i) => [`sr-e${i + 1}`, { src: `${BASE}/episode-${i + 1}-vertical.mp4`, poster: `${BASE}/poster-${i + 1}.jpg` }]).concat([
      ["sr-e7", { src: "", poster: `${BASE}/poster-6.jpg` }],
    ]),
  ),
  prices: { episode: 300, pass: 1500, nextPass: 1500 },
};

export const demoHorizontal: DemoFeedSeries = {
  slug: "nuits-de-cotonou",
  title: "Nuits de Cotonou",
  synopsis: "Démonstration d'une série tournée au format horizontal (16:9), affichée entière, sans déformation.",
  orientation: "landscape",
  season: season("Nuits de Cotonou", "nc"),
  nextSeason: null,
  media: Object.fromEntries(
    Array.from({ length: 7 }, (_, i) => [`nc-e${i + 1}`, { src: `${BASE}/episode-horizontal.mp4`, poster: `${BASE}/poster-horizontal.jpg` }]),
  ),
  prices: { episode: 300, pass: 1500, nextPass: 1500 },
};
