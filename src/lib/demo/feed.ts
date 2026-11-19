/**
 * Données de la MAQUETTE du lecteur vertical (étape 2). Vidéos de démonstration générées
 * (dégradés animés de 14 s, sans son) — ni contenu réel ni identité définitive.
 * Séries sans saisons (décision du 2026-11-21) : durées « catalogue » réalistes (~1 min 30).
 */
import type { SeriesPrices } from "@/lib/player/pricing";
import type { OtherSeries, SeriesInfo } from "@/lib/player/sequencer";

export type DemoFeedSeries = {
  slug: string;
  title: string;
  synopsis: string;
  orientation: "portrait" | "landscape";
  series: SeriesInfo;
  media: Record<string, { src: string; poster: string }>;
  prices: SeriesPrices;
};

/** Tarifs de démonstration (décision du 2026-11-22) : 499 FCFA par épisode payant, Pass propre à la série. */
function demoPrices(id: string, pass: number): SeriesPrices {
  return { pass, episodes: Object.fromEntries(titles.slice(2).map((_, i) => [`${id}-e${i + 3}`, 499])) };
}

const BASE = "/maquettes/videos";
const titles = ["La Couronne vacante", "Le Pacte", "Les Masques", "La Trahison", "Le Serment", "Le Conseil", "L'Exil"];
const durations = [92, 88, 95, 101, 86, 97, 90];

function makeSeries(id: string, title: string): SeriesInfo {
  return {
    id,
    title,
    episodes: titles.map((t, i) => ({
      id: `${id}-e${i + 1}`,
      number: i + 1,
      title: t,
      durationSeconds: durations[i]!,
      access: i < 2 ? ("free" as const) : ("paid" as const),
      status: i < 6 ? ("published" as const) : ("scheduled" as const),
      publishAt: i < 6 ? undefined : "2026-11-28T18:00:00Z",
    })),
  };
}

export const otherSeries: OtherSeries[] = [
  { id: "nc", slug: "nuits-de-cotonou", title: "Nuits de Cotonou", poster: `${BASE}/affiche-nuits-de-cotonou.jpg`, available: false },
  { id: "mp", slug: "le-marche-des-promesses", title: "Le Marché des Promesses", poster: `${BASE}/affiche-le-marche-des-promesses.jpg`, available: false },
  { id: "he", slug: "heritage", title: "L'Héritage", poster: `${BASE}/affiche-heritage.jpg`, available: false },
  { id: "fn", slug: "fleuve-noir", title: "Fleuve Noir", poster: `${BASE}/affiche-fleuve-noir.jpg`, available: false },
  { id: "ep", slug: "les-epouses", title: "Les Épouses", poster: `${BASE}/affiche-les-epouses.jpg`, available: false },
];

export const demoVertical: DemoFeedSeries = {
  slug: "sang-royal",
  title: "Sang Royal",
  synopsis: "Le roi meurt sans désigner d'héritier. Entre alliances et trahisons, deux héritiers se disputent le trône.",
  orientation: "portrait",
  series: makeSeries("sr", "Sang Royal"),
  media: Object.fromEntries(
    Array.from({ length: 7 }, (_, i) => [
      `sr-e${i + 1}`,
      { src: i < 6 ? `${BASE}/episode-${i + 1}-vertical.mp4` : "", poster: `${BASE}/poster-${Math.min(i + 1, 6)}.jpg` },
    ]),
  ),
  prices: demoPrices("sr", 1500),
};

export const demoHorizontal: DemoFeedSeries = {
  slug: "nuits-de-cotonou-horizontal",
  title: "Nuits de Cotonou",
  synopsis: "Démonstration d'une série tournée au format horizontal (16:9), affichée entière, sans déformation.",
  orientation: "landscape",
  series: makeSeries("nch", "Nuits de Cotonou"),
  media: Object.fromEntries(
    Array.from({ length: 7 }, (_, i) => [`nch-e${i + 1}`, { src: `${BASE}/episode-horizontal.mp4`, poster: `${BASE}/poster-horizontal.jpg` }]),
  ),
  prices: demoPrices("nch", 1500),
};
