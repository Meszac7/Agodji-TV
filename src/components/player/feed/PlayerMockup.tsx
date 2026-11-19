"use client";

import { useEffect, useMemo, useState } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { CheckIcon, LockIcon, PlayIcon } from "@/components/ui/icons";
import { demoHorizontal, demoVertical, otherSeries } from "@/lib/demo/feed";
import { formatPrice } from "@/lib/money";
import { clearProgress, formatClock, loadProgress, saveProgress, type Progress } from "@/lib/player/local-progress";
import {
  buildSlides,
  episodeAccess,
  formatMinutes,
  isCompleted,
  resumeIndex,
  totalDurationSeconds,
  type Entitlements,
  type OtherSeries,
} from "@/lib/player/sequencer";
import { VerticalFeed } from "./VerticalFeed";

type Scenario = "none" | "episode" | "pass";
type View = "catalog" | "series" | "player";

/**
 * Maquette cliquable (séries sans saisons, Pass série) :
 * catalogue → fiche série → lecteur vertical en défilement continu → fin de série.
 */
export function PlayerMockup() {
  const [format, setFormat] = useState<"vertical" | "horizontal">("vertical");
  const [scenario, setScenario] = useState<Scenario>("none");
  const [view, setView] = useState<View>("series");
  const [notice, setNotice] = useState<string | null>(null);
  const demo = format === "vertical" ? demoVertical : demoHorizontal;
  const storageKey = `agodjie-maquette-progression-${demo.slug}`;
  const [progress, setProgress] = useState<Progress>(new Map());
  const [ent, setEnt] = useState<Entitlements>({ seriesPassIds: new Set(), episodeIds: new Set() });

  useEffect(() => {
    setProgress(loadProgress(storageKey));
  }, [storageKey, view]);

  useEffect(() => {
    setEnt({
      seriesPassIds: new Set(scenario === "pass" ? [demo.series.id] : []),
      episodeIds: new Set(scenario === "episode" ? [`${demo.series.id}-e5`] : []),
    });
  }, [scenario, demo]);

  const slides = useMemo(() => buildSlides(demo.series, ent, otherSeries), [demo, ent]);
  const startIndex = resumeIndex(slides, progress);
  const startSlide = slides[startIndex];
  const startProgress = startSlide?.kind === "episode" ? progress.get(startSlide.episode.id) : undefined;
  const published = demo.series.episodes.filter((e) => e.status === "published");
  const upcoming = demo.series.episodes.filter((e) => e.status === "scheduled");
  // Côté spectateur : durée des épisodes publiés. (L'admin compte aussi les épisodes programmés pour la limite de 15 min.)
  const total = totalDurationSeconds({ ...demo.series, episodes: published });
  const passOwned = ent.seriesPassIds.has(demo.series.id);

  function onProgressChange(episodeId: string, position: number, duration: number) {
    setProgress((prev) => {
      const next = new Map(prev);
      next.set(episodeId, { positionSeconds: position, completed: isCompleted(position, duration), updatedAt: Date.now() });
      saveProgress(storageKey, next);
      return next;
    });
  }

  function openOther(s: OtherSeries) {
    setNotice(`« ${s.title} » arrive bientôt sur Agodjié TV.`);
    setView("catalog");
  }

  if (view === "player") {
    return (
      <VerticalFeed
        key={`${format}-${scenario}`}
        seriesTitle={demo.title}
        orientation={demo.orientation}
        series={demo.series}
        otherSeries={otherSeries}
        media={demo.media}
        prices={demo.prices}
        initialEntitlements={ent}
        initialIndex={startIndex}
        progress={progress}
        onProgressChange={onProgressChange}
        onExit={() => setView("series")}
        onOpenSeries={openOther}
        onCatalog={() => setView("catalog")}
        onEntitlementsChange={setEnt}
      />
    );
  }

  if (view === "catalog") {
    const all = [{ id: demo.series.id, slug: demo.slug, title: demo.title, poster: demo.media[`${demo.series.id}-e1`]?.poster ?? "", available: true }, ...otherSeries];
    return (
      <main className="min-h-dvh bg-bg pb-10" data-theme="dark" data-testid="mock-catalog">
        <header className="flex h-14 items-center justify-between px-4">
          <Wordmark size="sm" />
          <span className="rounded-full border border-border px-3 py-1 text-[12px] text-muted">Maquette · catalogue</span>
        </header>
        {notice ? <p className="mx-4 mb-3 rounded-[var(--radius-card)] bg-surface p-3 text-[14px]" role="status">{notice}</p> : null}
        <h1 className="px-4 font-display text-2xl font-bold">Séries</h1>
        <div className="mt-3 grid grid-cols-3 gap-3 px-4 sm:grid-cols-6">
          {all.map((s) => (
            <button key={s.id} type="button" onClick={() => (s.available ? (setNotice(null), setView("series")) : setNotice(`« ${s.title} » arrive bientôt sur Agodjié TV.`))} className="text-left">
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

  const poster = demo.media[`${demo.series.id}-e1`]?.poster;
  const resumeLabel =
    progress.size === 0
      ? "Regarder l'épisode 1 — Gratuit"
      : startSlide?.kind === "episode"
        ? `Reprendre — Épisode ${startSlide.episode.number}${startProgress && !startProgress.completed && startProgress.positionSeconds >= 3 ? ` à ${formatClock(startProgress.positionSeconds)}` : ""}`
        : "Reprendre la série";

  return (
    <main className="min-h-dvh bg-bg pb-10" data-theme="dark">
      <header className="flex h-14 items-center justify-between px-4">
        <button type="button" onClick={() => setView("catalog")} aria-label="Catalogue">
          <Wordmark size="sm" />
        </button>
        <span className="rounded-full border border-border px-3 py-1 text-[12px] text-muted">Maquette du lecteur</span>
      </header>

      <section className="relative isolate overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={poster} alt="" aria-hidden className="absolute inset-0 -z-10 h-full w-full scale-110 object-cover opacity-50 blur-2xl" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent to-bg" />
        <div className="mx-auto flex max-w-xl flex-col gap-3 px-4 pb-6 pt-8">
          <p className="text-[12px] uppercase tracking-[0.18em] text-primary-text">Série</p>
          <h1 className="font-display text-[40px] font-extrabold uppercase leading-none">{demo.title}</h1>
          <p className="text-text/90">{demo.synopsis}</p>
          <p className="text-[13px] text-muted" data-testid="series-meta">
            {published.length} épisodes · {formatMinutes(total)} au total
            {upcoming.length > 0 ? ` · ${upcoming.length} à venir` : ""} · épisodes 1 et 2 gratuits
          </p>
          <button
            type="button"
            onClick={() => setView("player")}
            className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-6 font-display font-bold text-on-primary"
            data-testid="enter-player"
          >
            <PlayIcon width={18} height={18} />
            {resumeLabel}
          </button>
          {passOwned ? (
            <p className="flex items-center justify-center gap-1.5 text-[14px] text-success" data-testid="pass-owned">
              <CheckIcon width={16} height={16} /> Pass série acquis — toute la série est débloquée
            </p>
          ) : (
            <p className="text-center text-[13px] text-muted">
              Toute la série : <span className="font-medium text-text">{formatPrice(demo.prices.pass, "XOF")}</span> avec le pass série · ou{" "}
              {formatPrice(demo.prices.episode, "XOF")} l&apos;épisode
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-xl px-4">
        <h2 className="mb-2 font-display text-lg font-bold">Épisodes</h2>
        <ul className="grid gap-1" data-testid="episode-list">
          {demo.series.episodes.map((e) => {
            const a = episodeAccess(e, demo.series.id, ent);
            const p = progress.get(e.id);
            const label = e.status === "scheduled" ? "Bientôt" : e.access === "free" ? "Gratuit" : a.state === "playable" ? (a.reason === "pass" ? "Inclus" : "Acheté") : formatPrice(demo.prices.episode, "XOF");
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

      <section className="mx-auto mt-6 max-w-xl px-4">
        <div className="rounded-[var(--radius-card)] border border-dashed border-border p-4">
          <p className="font-display font-bold">Réglages de la maquette</p>
          <p className="mb-3 text-[13px] text-muted">Pour tester les différents cas. Ces réglages n&apos;existent pas dans le vrai site.</p>
          <fieldset className="mb-3">
            <legend className="mb-1.5 text-[13px] text-muted">Format de la série</legend>
            <div className="flex gap-2">
              {(["vertical", "horizontal"] as const).map((f) => (
                <button key={f} type="button" onClick={() => setFormat(f)} aria-pressed={format === f} className={`rounded-full border px-3 py-1.5 text-[13px] ${format === f ? "border-primary text-primary-text" : "border-border text-muted"}`}>
                  {f === "vertical" ? "Vertical 9:16" : "Horizontal 16:9"}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="mb-3">
            <legend className="mb-1.5 text-[13px] text-muted">Achats au départ (un clic réinitialise les achats)</legend>
            <div className="flex flex-wrap gap-2">
              {([
                ["none", "Aucun achat"],
                ["episode", "Épisode 5 acheté"],
                ["pass", "Pass série"],
              ] as const).map(([v, label]) => (
                <button key={v} type="button" onClick={() => setScenario(v)} aria-pressed={scenario === v} className={`rounded-full border px-3 py-1.5 text-[13px] ${scenario === v ? "border-primary text-primary-text" : "border-border text-muted"}`}>
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <button type="button" onClick={() => { clearProgress(storageKey); setProgress(new Map()); }} className="text-[13px] text-muted underline underline-offset-4">
            Effacer la progression de lecture
          </button>
          <p className="mt-3 text-[12px] text-muted">
            Vidéos de démonstration de 14 secondes, sans son (les durées affichées dans la liste sont celles d&apos;une vraie série). Paiements simulés.
          </p>
        </div>
      </section>
    </main>
  );
}
