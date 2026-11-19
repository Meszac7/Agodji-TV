/**
 * Séquenceur du lecteur en défilement continu (TECHNICAL_ARCHITECTURE §6.4, couche « ordre des épisodes »).
 * Pas de saisons : une série = une histoire complète, épisodes 1 → N (décision du 2026-11-21).
 * Fonction pure : à partir d'une série, de ses épisodes et des droits de l'utilisateur, construit la suite
 * de diapositives et dit si l'enchaînement automatique est permis.
 * Il DÉCRIT les états ; le serveur VÉRIFIE toujours le droit avant d'émettre un lien de lecture.
 */

export type EpisodeInfo = {
  id: string;
  number: number;
  title: string;
  durationSeconds: number;
  access: "free" | "paid";
  /** published = lisible publiquement ; scheduled = annoncé avec une date future. Les brouillons ne sont jamais transmis. */
  status: "published" | "scheduled";
  publishAt?: string;
};

export type SeriesInfo = {
  id: string;
  title: string;
  episodes: EpisodeInfo[];
};

export type Entitlements = {
  /** Séries couvertes par un pass série. */
  seriesPassIds: ReadonlySet<string>;
  /** Épisodes achetés à l'unité. */
  episodeIds: ReadonlySet<string>;
};

export type OtherSeries = { id: string; slug: string; title: string; poster: string; available: boolean };

export type Slide =
  | { kind: "episode"; episode: EpisodeInfo; state: "playable" | "locked"; reason: "free" | "pass" | "episode" | "none" }
  | { kind: "scheduled"; episode: EpisodeInfo; coveredByPass: boolean }
  | { kind: "series-end"; nextScheduledAt: string | null; otherSeries: OtherSeries[] };

export function hasSeriesPass(seriesId: string, ent: Entitlements): boolean {
  return ent.seriesPassIds.has(seriesId);
}

export function episodeAccess(
  episode: EpisodeInfo,
  seriesId: string,
  ent: Entitlements,
): { state: "playable" | "locked"; reason: "free" | "pass" | "episode" | "none" } {
  if (episode.status !== "published") return { state: "locked", reason: "none" };
  if (episode.access === "free") return { state: "playable", reason: "free" };
  if (ent.seriesPassIds.has(seriesId)) return { state: "playable", reason: "pass" };
  if (ent.episodeIds.has(episode.id)) return { state: "playable", reason: "episode" };
  return { state: "locked", reason: "none" };
}

export function buildSlides(series: SeriesInfo, ent: Entitlements, otherSeries: OtherSeries[]): Slide[] {
  const ordered = [...series.episodes].sort((a, b) => a.number - b.number);
  const slides: Slide[] = ordered.map((episode) =>
    episode.status === "scheduled"
      ? { kind: "scheduled", episode, coveredByPass: ent.seriesPassIds.has(series.id) }
      : { kind: "episode", episode, ...episodeAccess(episode, series.id, ent) },
  );
  const nextScheduled = ordered.find((e) => e.status === "scheduled")?.publishAt ?? null;
  // Fin de série (FR-42) : autres séries + retour au catalogue ; jamais de « saison suivante ».
  slides.push({ kind: "series-end", nextScheduledAt: nextScheduled, otherSeries: otherSeries.filter((s) => s.id !== series.id) });
  return slides;
}

/**
 * Enchaînement automatique à la fin d'un épisode (FR-33, RM-14).
 * Jamais de lecture automatique d'un contenu verrouillé : on s'y arrête, sans lecture ni paiement.
 */
export function autoAdvance(slides: Slide[], fromIndex: number): { index: number; autoplay: boolean } | null {
  const nextIndex = fromIndex + 1;
  const next = slides[nextIndex];
  if (!next) return null;
  if (next.kind === "episode") return { index: nextIndex, autoplay: next.state === "playable" };
  return { index: nextIndex, autoplay: false };
}

/** Avec le pass série, aucune diapositive ne demande de paiement (RM-16). */
export function paymentPromptCount(slides: Slide[]): number {
  return slides.filter((s) => s.kind === "episode" && s.state === "locked").length;
}

export type EpisodeProgress = { positionSeconds: number; completed: boolean; updatedAt?: number };

/**
 * Index de reprise (FR-37) : l'épisode regardé le plus récemment.
 * - s'il n'est pas terminé → on y revient (à sa position) ;
 * - s'il est terminé → diapositive suivante ;
 * - aucune progression → premier épisode.
 */
export function resumeIndex(slides: Slide[], progress: ReadonlyMap<string, EpisodeProgress>): number {
  let best = -1;
  let bestAt = -Infinity;
  slides.forEach((s, i) => {
    if (s.kind !== "episode") return;
    const p = progress.get(s.episode.id);
    if (!p) return;
    const at = p.updatedAt ?? 0;
    if (at >= bestAt) {
      best = i;
      bestAt = at;
    }
  });
  if (best === -1) return 0;
  const last = slides[best]!;
  const p = last.kind === "episode" ? progress.get(last.episode.id) : undefined;
  return p?.completed ? Math.min(best + 1, slides.length - 1) : best;
}

/** « Vu » au-delà de 95 % (FR-37). */
export function isCompleted(positionSeconds: number, durationSeconds: number): boolean {
  return durationSeconds > 0 && positionSeconds / durationSeconds >= 0.95;
}

/** Somme des durées des épisodes fournis (au spectateur : les publiés ; à l'admin : publiés + programmés). */
export function totalDurationSeconds(series: SeriesInfo): number {
  return series.episodes.reduce((sum, e) => sum + e.durationSeconds, 0);
}

export function formatMinutes(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return s === 0 ? `${m} min` : `${m} min ${String(s).padStart(2, "0")}`;
}
