"use client";

import { useEffect, useMemo, useState } from "react";
import { demoHorizontal, demoVertical, otherSeries } from "@/lib/demo/feed";
import { clearProgress, loadProgress, saveProgress, type Progress } from "@/lib/player/local-progress";
import { buildSlides, isCompleted, resumeIndex, type Entitlements, type OtherSeries } from "@/lib/player/sequencer";
import { PurchaseSheet } from "./Sheets";
import { CatalogView, resumeLabelFor, SeriesPageView } from "./SeriesViews";
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
  const [buyingPass, setBuyingPass] = useState(false);

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
      <CatalogView
        items={all}
        notice={notice}
        badge="Maquette · catalogue"
        testId="mock-catalog"
        onOpen={(s) => (s.available ? (setNotice(null), setView("series")) : setNotice(`« ${s.title} » arrive bientôt sur Agodjié TV.`))}
      />
    );
  }

  const poster = demo.media[`${demo.series.id}-e1`]?.poster;
  const resumeLabel = resumeLabelFor(slides, progress, startIndex);

  return (
    <SeriesPageView
      badge="Maquette du lecteur"
      onLogo={() => setView("catalog")}
      title={demo.title}
      synopsis={demo.synopsis}
      poster={poster}
      series={demo.series}
      ent={ent}
      progress={progress}
      prices={demo.prices}
      resumeLabel={resumeLabel}
      onPlay={() => setView("player")}
      onBuyPass={() => setBuyingPass(true)}
    >
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
      {buyingPass ? (
        <PurchaseSheet
          label={`Pass série · ${demo.title}`}
          description="Tous les épisodes de la série, y compris les prochains"
          amount={demo.prices.pass}
          onDone={() => {
            setBuyingPass(false);
            setEnt((prev) => ({ ...prev, seriesPassIds: new Set([...prev.seriesPassIds, demo.series.id]) }));
          }}
          onClose={() => setBuyingPass(false)}
        />
      ) : null}
    </SeriesPageView>
  );
}
