/**
 * Séquenceur du lecteur en défilement continu (TECHNICAL_ARCHITECTURE §6.4, couche 5).
 * Fonction pure : à partir d'une saison, de ses épisodes et des droits de l'utilisateur,
 * construit la suite de diapositives et dit si l'enchaînement automatique est permis.
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

export type SeasonInfo = {
  id: string;
  seriesTitle: string;
  number: number;
  episodes: EpisodeInfo[];
};

export type Entitlements = {
  /** Saisons couvertes par un pass. */
  seasonPassIds: ReadonlySet<string>;
  /** Épisodes achetés à l'unité. */
  episodeIds: ReadonlySet<string>;
};

export type NextSeasonInfo = {
  id: string;
  number: number;
  /** Premier épisode de la saison suivante, s'il est gratuit et publié. */
  firstEpisodeFree: boolean;
};

export type Slide =
  | { kind: "episode"; episode: EpisodeInfo; state: "playable" | "locked"; reason: "free" | "pass" | "episode" | "none" }
  | { kind: "scheduled"; episode: EpisodeInfo; coveredByPass: boolean }
  | {
      kind: "season-end";
      seasonNumber: number;
      next: null | { season: NextSeasonInfo; unlocked: boolean };
    };

export function episodeAccess(
  episode: EpisodeInfo,
  seasonId: string,
  ent: Entitlements,
): { state: "playable" | "locked"; reason: "free" | "pass" | "episode" | "none" } {
  if (episode.status !== "published") return { state: "locked", reason: "none" };
  if (episode.access === "free") return { state: "playable", reason: "free" };
  if (ent.seasonPassIds.has(seasonId)) return { state: "playable", reason: "pass" };
  if (ent.episodeIds.has(episode.id)) return { state: "playable", reason: "episode" };
  return { state: "locked", reason: "none" };
}

export function buildSlides(season: SeasonInfo, ent: Entitlements, nextSeason: NextSeasonInfo | null): Slide[] {
  const ordered = [...season.episodes].sort((a, b) => a.number - b.number);
  const slides: Slide[] = ordered.map((episode) =>
    episode.status === "scheduled"
      ? { kind: "scheduled", episode, coveredByPass: ent.seasonPassIds.has(season.id) }
      : { kind: "episode", episode, ...episodeAccess(episode, season.id, ent) },
  );
  slides.push({
    kind: "season-end",
    seasonNumber: season.number,
    // RM-13 : un pass ne couvre que SA saison — la saison suivante n'est débloquée que par son propre pass.
    next: nextSeason ? { season: nextSeason, unlocked: ent.seasonPassIds.has(nextSeason.id) } : null,
  });
  return slides;
}

/**
 * Enchaînement automatique à la fin d'un épisode (FR-33, RM-14).
 * Renvoie l'index de la diapositive suivante et si elle peut démarrer seule.
 * Jamais de lecture automatique d'un contenu verrouillé : on s'y arrête, sans lecture ni paiement.
 */
export function autoAdvance(slides: Slide[], fromIndex: number): { index: number; autoplay: boolean } | null {
  const nextIndex = fromIndex + 1;
  const next = slides[nextIndex];
  if (!next) return null;
  if (next.kind === "episode") return { index: nextIndex, autoplay: next.state === "playable" };
  return { index: nextIndex, autoplay: false };
}

export type EpisodeProgress = { positionSeconds: number; completed: boolean; updatedAt?: number };

/**
 * Index de reprise (FR-37) : l'épisode regardé le plus récemment.
 * - s'il n'est pas terminé → on y revient (à sa position) ;
 * - s'il est terminé → diapositive suivante (épisode suivant, déblocage ou fin de saison) ;
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
