"use client";

import { useEffect, useMemo, useState } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { PlayIcon } from "@/components/ui/icons";
import { demoHorizontal, demoVertical } from "@/lib/demo/feed";
import { formatPrice } from "@/lib/money";
import { clearProgress, formatClock, loadProgress, saveProgress, type Progress } from "@/lib/player/local-progress";
import { buildSlides, isCompleted, resumeIndex, type Entitlements } from "@/lib/player/sequencer";
import { VerticalFeed } from "./VerticalFeed";

type Scenario = "none" | "episode" | "pass";

/** Maquette cliquable : fiche série simplifiée → lecteur vertical en défilement continu. */
export function PlayerMockup() {
  const [format, setFormat] = useState<"vertical" | "horizontal">("vertical");
  const [scenario, setScenario] = useState<Scenario>("none");
  const [entered, setEntered] = useState(false);
  const series = format === "vertical" ? demoVertical : demoHorizontal;
  const storageKey = `agodjie-maquette-progression-${series.slug}`;
  const [progress, setProgress] = useState<Progress>(new Map());

  useEffect(() => {
    setProgress(loadProgress(storageKey));
  }, [storageKey, entered]);

  const ent: Entitlements = useMemo(
    () => ({
      seasonPassIds: new Set(scenario === "pass" ? [series.season.id] : []),
      episodeIds: new Set(scenario === "episode" ? [`${series.season.id.split("-")[0]}-e5`] : []),
    }),
    [scenario, series],
  );
  const slides = useMemo(() => buildSlides(series.season, ent, series.nextSeason), [series, ent]);
  const startIndex = resumeIndex(slides, progress);
  const startSlide = slides[startIndex];
  const startProgress = startSlide?.kind === "episode" ? progress.get(startSlide.episode.id) : undefined;
  const resuming = progress.size > 0;

  function onProgressChange(episodeId: string, position: number, duration: number) {
    setProgress((prev) => {
      const next = new Map(prev);
      next.set(episodeId, { positionSeconds: position, completed: isCompleted(position, duration), updatedAt: Date.now() });
      saveProgress(storageKey, next);
      return next;
    });
  }

  if (entered) {
    return (
      <VerticalFeed
        key={`${format}-${scenario}`}
        seriesTitle={series.title}
        orientation={series.orientation}
        season={series.season}
        nextSeason={series.nextSeason}
        media={series.media}
        prices={series.prices}
        initialEntitlements={ent}
        initialIndex={startIndex}
        progress={progress}
        onProgressChange={onProgressChange}
        onExit={() => setEntered(false)}
      />
    );
  }

  const poster = series.media[`${series.season.id.split("-")[0]}-e1`]?.poster;
  return (
    <main className="min-h-dvh bg-bg pb-10" data-theme="dark">
      <header className="flex h-14 items-center justify-between px-4">
        <Wordmark size="sm" />
        <span className="rounded-full border border-border px-3 py-1 text-[12px] text-muted">Maquette du lecteur</span>
      </header>

      <section className="relative isolate overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={poster} alt="" aria-hidden className="absolute inset-0 -z-10 h-full w-full scale-110 object-cover opacity-50 blur-2xl" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent to-bg" />
        <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 pb-8 pt-10">
          <p className="text-[12px] uppercase tracking-[0.18em] text-primary-text">Série · Saison 1</p>
          <h1 className="font-display text-[40px] font-extrabold uppercase leading-none">{series.title}</h1>
          <p className="text-text/90">{series.synopsis}</p>
          <p className="text-[13px] text-muted">
            6 épisodes publiés + 1 à venir · épisodes 1 et 2 gratuits · {formatPrice(series.prices.episode, "XOF")} l&apos;épisode ou{" "}
            {formatPrice(series.prices.pass, "XOF")} la saison
          </p>
          <button
            type="button"
            onClick={() => setEntered(true)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-6 font-display font-bold text-on-primary"
            data-testid="enter-player"
          >
            <PlayIcon width={18} height={18} />
            {resuming && startSlide?.kind === "episode"
              ? `Reprendre — Épisode ${startSlide.episode.number}${startProgress && !startProgress.completed && startProgress.positionSeconds >= 3 ? ` à ${formatClock(startProgress.positionSeconds)}` : ""}`
              : resuming
                ? "Reprendre la série"
                : "Regarder l'épisode 1 — Gratuit"}
          </button>
        </div>
      </section>

      <section className="mx-auto mt-2 max-w-xl px-4">
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
            <legend className="mb-1.5 text-[13px] text-muted">Achats de l&apos;utilisateur</legend>
            <div className="flex flex-wrap gap-2">
              {([
                ["none", "Aucun achat"],
                ["episode", "Épisode 5 acheté"],
                ["pass", "Pass saison 1"],
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
          <p className="mt-3 text-[12px] text-muted">Vidéos de démonstration de 14 secondes, sans son. Paiements simulés.</p>
        </div>
      </section>
    </main>
  );
}
