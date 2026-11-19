/**
 * Offres d'achat d'une série (décision du 2026-11-22) — fonctions pures.
 * - Épisode à l'unité : prix propre à chaque épisode (499 FCFA de référence en XOF).
 * - Pass série : prix propre à la série, couvre tous les épisodes, y compris les prochains.
 * Le serveur recalcule TOUJOURS le prix au moment de l'achat ; ces calculs ne servent qu'à l'affichage.
 */
import { episodeAccess, type Entitlements, type SeriesInfo } from "./sequencer";

export type SeriesPrices = {
  /** Prix du Pass de cette série (dans la devise de la grille). */
  pass: number;
  /** Prix de chaque épisode payant, par identifiant d'épisode. */
  episodes: Readonly<Record<string, number>>;
};

export function episodePrice(prices: SeriesPrices, episodeId: string): number | null {
  return prices.episodes[episodeId] ?? null;
}

export type PassOffer = {
  /** Épisodes payants publiés que l'utilisateur ne possède pas encore. */
  remainingCount: number;
  /** Total de ces épisodes achetés un par un. */
  remainingTotal: number;
  /** Économie réalisée avec le Pass (jamais négative). */
  saving: number;
  /** Épisodes annoncés (programmés) inclus dans le Pass. */
  upcomingCount: number;
  /** Prix unitaire le plus bas parmi les épisodes payants (« à partir de »). */
  minEpisodePrice: number | null;
  /** Vrai si tous les épisodes payants ont le même prix. */
  uniformEpisodePrice: boolean;
};

export function passOffer(series: SeriesInfo, ent: Entitlements, prices: SeriesPrices): PassOffer {
  const paid = series.episodes.filter((e) => e.access === "paid");
  const remaining = paid.filter((e) => e.status === "published" && episodeAccess(e, series.id, ent).state === "locked");
  const remainingTotal = remaining.reduce((sum, e) => sum + (episodePrice(prices, e.id) ?? 0), 0);
  const paidPrices = paid.map((e) => episodePrice(prices, e.id)).filter((p): p is number => p !== null);
  return {
    remainingCount: remaining.length,
    remainingTotal,
    saving: Math.max(0, remainingTotal - prices.pass),
    upcomingCount: series.episodes.filter((e) => e.status === "scheduled").length,
    minEpisodePrice: paidPrices.length ? Math.min(...paidPrices) : null,
    uniformEpisodePrice: new Set(paidPrices).size <= 1,
  };
}
