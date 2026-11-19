/**
 * Données de démonstration pour le guide de style (étape 1).
 * Titres et visuels FICTIFS : ils ne constituent ni le catalogue réel ni l'identité officielle.
 * Les visuels d'affiche sont générés (dégradés) en attendant les vraies affiches.
 * Ces couleurs sont du contenu de démonstration, pas des jetons d'interface.
 */
import type { CurrencyCode } from "../money";

export type PosterPalette = { from: string; via: string; to: string; glow: string };
export type Orientation = "landscape" | "portrait";

export type DemoSeries = {
  slug: string;
  title: string;
  tagline: string;
  genres: string[];
  status: "published" | "coming_soon";
  releaseLabel?: string;
  orientation: Orientation;
  palette: PosterPalette;
  /** Nombre d'épisodes publiés et durée totale (séries sans saisons). */
  episodes: number;
  totalSeconds: number;
};

export const demoSeries: DemoSeries[] = [
  {
    slug: "sang-royal",
    title: "Sang Royal",
    tagline: "Un trône, deux héritiers, une seule nuit pour tout perdre.",
    genres: ["Drame", "Intrigue"],
    status: "published",
    orientation: "landscape",
    palette: { from: "#3b0d0c", via: "#8c2f1b", to: "#e0a43a", glow: "#ffcf6e" },
    episodes: 8,
    totalSeconds: 721,
  },
  {
    slug: "nuits-de-cotonou",
    title: "Nuits de Cotonou",
    tagline: "Quand la ville s'endort, les secrets se réveillent.",
    genres: ["Thriller"],
    status: "coming_soon",
    releaseLabel: "Prochainement",
    orientation: "landscape",
    palette: { from: "#06112b", via: "#1d3a8a", to: "#6f5bd6", glow: "#9ad0ff" },
    episodes: 0,
    totalSeconds: 0,
  },
  {
    slug: "le-marche-des-promesses",
    title: "Le Marché des Promesses",
    tagline: "Tout s'achète. Même la loyauté.",
    genres: ["Drame", "Famille"],
    status: "coming_soon",
    releaseLabel: "Prochainement",
    orientation: "portrait",
    palette: { from: "#0f2a1c", via: "#1f6b45", to: "#c9b04a", glow: "#f2e08a" },
    episodes: 0,
    totalSeconds: 0,
  },
  {
    slug: "heritage",
    title: "L'Héritage",
    tagline: "Le testament ne disait pas tout.",
    genres: ["Drame"],
    status: "coming_soon",
    releaseLabel: "Prochainement",
    orientation: "landscape",
    palette: { from: "#1a1210", via: "#5c3a24", to: "#d08a4e", glow: "#ffd2a1" },
    episodes: 0,
    totalSeconds: 0,
  },
  {
    slug: "fleuve-noir",
    title: "Fleuve Noir",
    tagline: "Ce que l'eau emporte finit toujours par revenir.",
    genres: ["Mystère"],
    status: "coming_soon",
    releaseLabel: "Prochainement",
    orientation: "portrait",
    palette: { from: "#041a1f", via: "#0e4d57", to: "#3fa7a3", glow: "#a8f0e0" },
    episodes: 0,
    totalSeconds: 0,
  },
  {
    slug: "les-epouses",
    title: "Les Épouses",
    tagline: "Une maison, trois femmes, aucune vérité.",
    genres: ["Drame", "Romance"],
    status: "coming_soon",
    releaseLabel: "Prochainement",
    orientation: "landscape",
    palette: { from: "#24081f", via: "#7a1d5a", to: "#e05a7a", glow: "#ffb3c8" },
    episodes: 0,
    totalSeconds: 0,
  },
];

export type DemoEpisode = {
  number: number;
  title: string;
  synopsis: string;
  durationSeconds: number;
  access: "free" | "paid";
  /** État d'accès simulé pour illustrer les badges. */
  demoOwnership?: "owned" | "pass";
};

export const demoEpisodes: DemoEpisode[] = [
  { number: 1, title: "La Couronne vacante", synopsis: "Le roi meurt sans désigner d'héritier. Au palais, chacun choisit son camp avant l'aube.", durationSeconds: 754, access: "free" },
  { number: 2, title: "Le Pacte", synopsis: "Adjoa découvre une lettre qui pourrait tout changer — à condition de survivre jusqu'au conseil.", durationSeconds: 812, access: "free" },
  { number: 3, title: "Les Masques", synopsis: "Une alliance inattendue se noue pendant la cérémonie, sous le regard des anciens.", durationSeconds: 798, access: "paid", demoOwnership: "owned" },
  { number: 4, title: "La Trahison", synopsis: "Un proche de la famille royale vend un secret au plus offrant.", durationSeconds: 845, access: "paid", demoOwnership: "pass" },
  { number: 5, title: "Le Serment", synopsis: "Kofi doit choisir entre son frère et la couronne.", durationSeconds: 779, access: "paid" },
];

export const demoPricing: { currency: CurrencyCode; episode: number; pass: number; countryLabel: string } = {
  currency: "XOF",
  episode: 499,
  pass: 1500,
  countryLabel: "Bénin",
};

export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m} min ${String(s).padStart(2, "0")}`;
}
