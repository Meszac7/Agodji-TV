"use client";

import { Wordmark } from "@/components/brand/Wordmark";
import { CheckIcon, LockIcon, PlayIcon } from "@/components/ui/icons";
import { formatPrice } from "@/lib/money";
import { formatClock, type Progress } from "@/lib/player/local-progress";
import { episodePrice, passOffer, type SeriesPrices } from "@/lib/player/pricing";
import { episodeAccess, formatMinutes, totalDurationSeconds, type Entitlements, type OtherSeries, type SeriesInfo, type Slide } from "@/lib/player/sequencer";

/**
 * Écrans validés de la maquette V2 (catalogue, fiche série), partagés à l'identique entre la maquette
 * et le site réel : seule la source des données change.
 */
export function CatalogView({ items, notice, badge, testId, onOpen }: { items: OtherSeries[]; notice: string | null; badge: string; testId: string; onOpen: (s: OtherSeries) => void }) {
  return (
      <main className="min-h-dvh bg-bg pb-10" data-theme="dark" data-testid={testId}>
        <header className="flex h-14 items-center justify-between px-4">
          <Wordmark size="sm" />
          <span className="rounded-full border border-border px-3 py-1 text-[12px] text-muted">{badge}</span>
        </header>
        {notice ? <p className="mx-4 mb-3 rounded-[var(--radius-card)] bg-surface p-3 text-[14px]" role="status">{notice}</p> : null}
        <h1 className="px-4 font-display text-2xl font-bold">Séries</h1>
        <div className="mt-3 grid grid-cols-3 gap-3 px-4 sm:grid-cols-6">
          {items.map((s) => (
            <button key={s.id} type="button" onClick={() => onOpen(s)} className="text-left">
              <span className="relative block aspect-[2/3] overflow-hidden rounded-[10px] bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.poster} alt="" className={`h-full w-full object-cover ${s.available ? "" : "saturate-50"}`} />
                {!s.available ? <span className="absolute left-1.5 top-1.5 rounded-[6px] bg-black/60 px-1.5 py-0.5 text-[11px] text-white">Bientôt</span> : null}
              </span>
              <span className="mt-1 line-clamp-1 block text-[13px] font-medium">{s.title}</span>
            </button>
          ))}
        </div>
      </main>
  );
}

/** « épisodes 1 et 2 gratuits », « épisode 1 gratuit » ou rien. */
export function freeEpisodesLabel(series: SeriesInfo): string {
  const free = series.episodes.filter((e) => e.status === "published" && e.access === "free").map((e) => e.number);
  if (free.length === 0) return "";
  if (free.length === 1) return `épisode ${free[0]} gratuit`;
  return `épisodes ${free.slice(0, -1).join(", ")} et ${free[free.length - 1]} gratuits`;
}

/** Libellé du bouton principal de la fiche : premier épisode ou reprise exacte (FR-30, FR-37). */
export function resumeLabelFor(slides: Slide[], progress: Progress, startIndex: number): string {
  const start = slides[startIndex];
  const p = start?.kind === "episode" ? progress.get(start.episode.id) : undefined;
  if (progress.size === 0) {
    const first = slides.find((s) => s.kind === "episode");
    if (!first || first.kind !== "episode") return "Voir la série";
    return `Regarder l'épisode ${first.episode.number}${first.episode.access === "free" ? " — Gratuit" : ""}`;
  }
  if (start?.kind === "episode") {
    return `Reprendre — Épisode ${start.episode.number}${p && !p.completed && p.positionSeconds >= 3 ? ` à ${formatClock(p.positionSeconds)}` : ""}`;
  }
  return "Reprendre la série";
}

export function SeriesPageView({
  badge,
  onLogo,
  title,
  synopsis,
  poster,
  series,
  ent,
  progress,
  prices,
  resumeLabel,
  onPlay,
  onBuyPass,
  children,
}: {
  badge: string;
  onLogo: () => void;
  title: string;
  synopsis: string;
  poster: string | undefined;
  series: SeriesInfo;
  ent: Entitlements;
  progress: Progress;
  prices: SeriesPrices | null;
  resumeLabel: string;
  onPlay: () => void;
  onBuyPass: () => void;
  children?: React.ReactNode;
}) {
  const published = series.episodes.filter((e) => e.status === "published");
  const upcoming = series.episodes.filter((e) => e.status === "scheduled");
  // Côté spectateur : durée des épisodes publiés. (L'admin compte tous les épisodes pour la limite de 15 min.)
  const total = totalDurationSeconds({ ...series, episodes: published });
  const passOwned = ent.seriesPassIds.has(series.id);
  const offer = prices ? passOffer(series, ent, prices) : null;
  const freeLabel = freeEpisodesLabel(series);
  return (
    <main className="min-h-dvh bg-bg pb-10" data-theme="dark">
      <header className="flex h-14 items-center justify-between px-4">
        <button type="button" onClick={onLogo} aria-label="Catalogue">
          <Wordmark size="sm" />
        </button>
        <span className="rounded-full border border-border px-3 py-1 text-[12px] text-muted">{badge}</span>
      </header>

      <section className="relative isolate overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={poster} alt="" aria-hidden className="absolute inset-0 -z-10 h-full w-full scale-110 object-cover opacity-50 blur-2xl" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent to-bg" />
        <div className="mx-auto flex max-w-xl flex-col gap-3 px-4 pb-6 pt-8">
          <p className="text-[12px] uppercase tracking-[0.18em] text-primary-text">Série</p>
          <h1 className="font-display text-[40px] font-extrabold uppercase leading-none">{title}</h1>
          <p className="text-text/90">{synopsis}</p>
          <p className="text-[13px] text-muted" data-testid="series-meta">
            {published.length} épisodes · {formatMinutes(total)} au total
            {upcoming.length > 0 ? ` · ${upcoming.length} à venir` : ""}{freeLabel ? ` · ${freeLabel}` : ""}
          </p>
          <button
            type="button"
            onClick={onPlay}
            className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-6 font-display font-bold text-on-primary"
            data-testid="enter-player"
          >
            <PlayIcon width={18} height={18} />
            {resumeLabel}
          </button>
          {passOwned || !prices || !offer ? (
            <p className="flex items-center justify-center gap-1.5 text-[14px] text-success" data-testid="pass-owned">
              <CheckIcon width={16} height={16} /> Pass série acquis — toute la série est débloquée
            </p>
          ) : (
            <div className="mt-2 grid gap-2" data-testid="purchase-options">
              <p className="text-[13px] font-medium text-muted">Deux façons de débloquer la suite</p>
              <button
                type="button"
                onClick={onBuyPass}
                className="relative rounded-[var(--radius-card)] border-2 border-primary bg-surface p-4 text-left"
                data-testid="offer-pass"
              >
                <span className="absolute -top-2.5 right-3 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-on-primary">Meilleure offre</span>
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-display text-base font-bold">Pass série</span>
                  <span className="font-display text-lg font-bold tabular-nums">{formatPrice(prices.pass, "XOF")}</span>
                </span>
                <span className="mt-1 block text-[13px] text-muted">
                  Tous les épisodes, y compris les prochains{offer.upcomingCount > 0 ? ` (${offer.upcomingCount} à venir)` : ""} · sans expiration
                </span>
                {offer.saving > 0 ? (
                  <span className="mt-2 inline-block rounded-[6px] bg-success/15 px-2 py-0.5 text-[13px] font-medium text-success" data-testid="pass-saving">
                    Économisez {formatPrice(offer.saving, "XOF")} + les prochains épisodes
                  </span>
                ) : null}
                {offer.remainingCount > 0 ? (
                  <span className="mt-1 block text-[12px] text-muted">
                    Au lieu de {formatPrice(offer.remainingTotal, "XOF")} pour {offer.remainingCount} épisode{offer.remainingCount > 1 ? "s" : ""} à l&apos;unité
                  </span>
                ) : null}
              </button>
              <a href="#episodes" className="block rounded-[var(--radius-card)] border border-border bg-surface p-4" data-testid="offer-episode">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-display text-base font-bold">À l&apos;unité</span>
                  <span className="font-display text-lg font-bold tabular-nums">
                    {offer.minEpisodePrice !== null
                      ? `${offer.uniformEpisodePrice ? "" : "dès "}${formatPrice(offer.minEpisodePrice, "XOF")}`
                      : "—"}
                  </span>
                </span>
                <span className="mt-1 block text-[13px] text-muted">Par épisode · seulement l&apos;épisode choisi · sans expiration</span>
              </a>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-xl px-4">
        <h2 id="episodes" className="mb-2 scroll-mt-4 font-display text-lg font-bold">Épisodes</h2>
        <ul className="grid gap-1" data-testid="episode-list">
          {series.episodes.map((e) => {
            const a = episodeAccess(e, series.id, ent);
            const p = progress.get(e.id);
            const label = e.status === "scheduled" ? "Bientôt" : e.access === "free" ? "Gratuit" : a.state === "playable" ? (a.reason === "pass" ? "Inclus" : "Acheté") : prices ? formatPrice(episodePrice(prices, e.id) ?? 0, "XOF") : "Payant";
            return (
              <li key={e.id} className="flex items-center gap-3 rounded-[var(--radius-control)] px-2 py-2">
                <span className="w-5 font-display font-bold tabular-nums text-muted">{e.number}</span>
                <span className="min-w-0 flex-1 truncate">{e.title}</span>
                <span className="text-[12px] tabular-nums text-muted">{formatClock(e.durationSeconds)}</span>
                <span className={`flex w-20 items-center justify-end gap-1 text-[12px] ${label === "Inclus" || label === "Acheté" || p?.completed ? "text-success" : "text-muted"}`}>
                  {a.state === "locked" && e.status === "published" ? <LockIcon width={12} height={12} /> : null}
                  {p?.completed ? "Vu" : label}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {children}
    </main>
  );
}
