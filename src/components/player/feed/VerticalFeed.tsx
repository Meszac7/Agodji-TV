"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon, FullscreenIcon, GridIcon } from "@/components/ui/icons";
import { autoAdvance, buildSlides, type Entitlements, type OtherSeries, type SeriesInfo } from "@/lib/player/sequencer";
import type { Progress } from "@/lib/player/local-progress";
import { EpisodeSlide } from "./EpisodeSlide";
import { episodePrice, passOffer, type SeriesPrices } from "@/lib/player/pricing";
import { LockedSlide } from "./LockedSlide";
import { ScheduledSlide, SeriesEndSlide } from "./InfoSlides";
import { EpisodesSheet, PurchaseSheet } from "./Sheets";

type Purchase = { kind: "pass"; seriesId: string; label: string; amount: number } | { kind: "episode"; episodeId: string; label: string; amount: number };

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" stroke="none" />
      {muted ? <path d="m16 9 5 6M21 9l-5 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}
    </svg>
  );
}

/**
 * Lecteur vertical en défilement continu (maquette, PRODUCT_REQUIREMENTS §5).
 * Couches : interface (ce composant + diapositives), séquenceur (buildSlides/autoAdvance),
 * droits (ici simulés par `entitlements` ; côté réel : serveur), progression (onProgress).
 */
export function VerticalFeed({
  seriesTitle,
  orientation,
  series,
  otherSeries,
  media,
  prices,
  initialEntitlements,
  initialIndex,
  progress,
  onProgressChange,
  onExit,
  onOpenSeries,
  onCatalog,
  onEntitlementsChange,
}: {
  seriesTitle: string;
  orientation: "portrait" | "landscape";
  series: SeriesInfo;
  otherSeries: OtherSeries[];
  media: Record<string, { src: string; poster: string }>;
  prices: SeriesPrices;
  initialEntitlements: Entitlements;
  initialIndex: number;
  progress: Progress;
  onProgressChange: (episodeId: string, position: number, duration: number) => void;
  onExit: () => void;
  onOpenSeries: (s: OtherSeries) => void;
  onCatalog: () => void;
  /** Remonte les droits obtenus pendant le visionnage (la fiche série reflète le pass acheté). */
  onEntitlementsChange?: (ent: Entitlements) => void;
}) {
  const [ent, setEnt] = useState<Entitlements>(initialEntitlements);
  const slides = useMemo(() => buildSlides(series, ent, otherSeries), [series, ent, otherSeries]);
  const publishedCount = series.episodes.filter((e) => e.status === "published").length;
  const [active, setActive] = useState(initialIndex);
  const [muted, setMuted] = useState(false);
  const [controls, setControls] = useState(true);
  const [sheet, setSheet] = useState<null | "episodes" | Purchase>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [hint, setHint] = useState(true);
  const scroller = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);

  const goTo = useCallback((index: number, smooth = true) => {
    const el = scroller.current;
    if (!el) return;
    const i = Math.max(0, Math.min(index, el.children.length - 1));
    el.scrollTo({ top: i * el.clientHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  const showControls = useCallback(() => {
    setControls(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setControls(false), 3000);
  }, []);

  const flashToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  // Position initiale (reprise) puis suivi de la diapositive visible.
  useEffect(() => {
    goTo(initialIndex, false);
    showControls();
    const t = window.setTimeout(() => setHint(false), 3500);
    const first = slides[initialIndex];
    if (first?.kind === "episode") {
      const p = progress.get(first.episode.id);
      if (p && !p.completed && p.positionSeconds > 1) {
        flashToast(`Reprise à ${Math.floor(p.positionSeconds / 60)}:${String(Math.floor(p.positionSeconds % 60)).padStart(2, "0")}`);
      }
    }
    return () => window.clearTimeout(t);
    // Exécuté une seule fois à l'entrée dans le lecteur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => {
      const i = Math.round(el.scrollTop / el.clientHeight);
      setActive((prev) => (prev === i ? prev : i));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sheet) return;
      if (e.key === "ArrowDown") { e.preventDefault(); goTo(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); goTo(active - 1); }
      else if (e.key === "m" || e.key === "M") setMuted((m) => !m);
      else if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, goTo, onExit, sheet]);

  const current = slides[active];
  const headerLabel =
    current && current.kind !== "series-end" ? `Épisode ${current.episode.number} / ${Math.max(publishedCount, current.episode.number)}` : "Fin de la série";

  function onEnded(index: number) {
    const next = autoAdvance(slides, index);
    if (next) goTo(next.index);
  }

  function completePurchase(p: Purchase) {
    const next: Entitlements =
      p.kind === "pass"
        ? { ...ent, seriesPassIds: new Set([...ent.seriesPassIds, p.seriesId]) }
        : { ...ent, episodeIds: new Set([...ent.episodeIds, p.episodeId]) };
    setEnt(next);
    onEntitlementsChange?.(next);
    setSheet(null);
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await root.current?.requestFullscreen();
      const orientationApi = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      if (orientation === "landscape" && orientationApi.lock) await orientationApi.lock("landscape").catch(() => undefined);
    } catch {
      flashToast("Plein écran non disponible sur ce navigateur.");
    }
  }

  const columnWidth = orientation === "portrait" ? "min(100vw, calc(100dvh * 9 / 16))" : "min(100vw, 1000px)";

  return (
    <div ref={root} className="fixed inset-0 z-50 bg-black text-white" data-testid="vertical-feed">
      <div className="relative mx-auto h-full" style={{ width: columnWidth }}>
        <div ref={scroller} className="no-scrollbar h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain" data-testid="feed-scroller">
          {slides.map((s, i) => {
            const key = s.kind === "series-end" ? "end" : s.episode.id;
            const m = s.kind === "series-end" ? undefined : media[s.episode.id];
            return (
              <section key={key} className="relative h-full w-full snap-start snap-always" aria-label={s.kind === "series-end" ? "Fin de la série" : `Épisode ${s.episode.number}`} data-slide-index={i}>
                {s.kind === "episode" && s.state === "playable" && m ? (
                  <EpisodeSlide
                    src={m.src}
                    poster={m.poster}
                    active={i === active && !sheet}
                    mountVideo={Math.abs(i - active) <= 1}
                    muted={muted}
                    orientation={orientation}
                    resumeAt={progress.get(s.episode.id)?.positionSeconds ?? 0}
                    onProgress={(pos, dur) => onProgressChange(s.episode.id, pos, dur)}
                    onEnded={() => onEnded(i)}
                    onTap={showControls}
                  />
                ) : null}
                {s.kind === "episode" && s.state === "locked" && m ? (
                  <LockedSlide
                    poster={m.poster}
                    episodeLabel={`${seriesTitle} · Épisode ${s.episode.number}`}
                    episodeTitle={s.episode.title}
                    passPrice={prices.pass}
                    episodePrice={episodePrice(prices, s.episode.id) ?? 0}
                    saving={passOffer(series, ent, prices).saving}
                    onChoose={(kind) =>
                      setSheet(
                        kind === "pass"
                          ? { kind: "pass", seriesId: series.id, label: `Pass série · ${seriesTitle}`, amount: prices.pass }
                          : { kind: "episode", episodeId: s.episode.id, label: `Épisode ${s.episode.number}`, amount: episodePrice(prices, s.episode.id) ?? 0 },
                      )
                    }
                  />
                ) : null}
                {s.kind === "scheduled" && m ? (
                  <ScheduledSlide
                    poster={m.poster}
                    label={`${seriesTitle} · Épisode ${s.episode.number}`}
                    title={s.episode.title}
                    date={s.episode.publishAt ?? new Date().toISOString()}
                    coveredByPass={s.coveredByPass}
                  />
                ) : null}
                {s.kind === "series-end" ? (
                  <SeriesEndSlide
                    seriesTitle={seriesTitle}
                    nextScheduledAt={s.nextScheduledAt}
                    otherSeries={s.otherSeries}
                    onOpenSeries={onOpenSeries}
                    onCatalog={onCatalog}
                  />
                ) : null}
              </section>
            );
          })}
        </div>

        {/* Haut : retour + titre discret */}
        <div className={`pointer-events-none absolute inset-x-0 top-0 z-40 flex items-center gap-2 bg-gradient-to-b from-black/55 to-transparent px-2 pb-6 pt-[max(8px,env(safe-area-inset-top))] transition-opacity duration-300 ${controls || current?.kind !== "episode" ? "opacity-100" : "opacity-0"}`}>
          <button type="button" onClick={onExit} aria-label="Retour à la série" className="pointer-events-auto grid size-10 place-items-center rounded-full">
            <ChevronDownIcon width={24} height={24} className="rotate-90" />
          </button>
          <p className="truncate text-[13px] [text-shadow:0_1px_3px_rgba(0,0,0,.8)]" data-testid="feed-title">
            <span className="font-display font-bold">{seriesTitle}</span>
            <span className="text-white/80"> · {headerLabel}</span>
          </p>
        </div>

        {/* Droite : commandes en colonne (uniquement sur un épisode en lecture) */}
        <div className={`absolute bottom-24 right-2 z-40 flex flex-col items-center gap-4 transition-opacity duration-300 ${current?.kind === "episode" && current.state === "playable" ? (controls ? "opacity-100" : "opacity-0 hover:opacity-100") : "pointer-events-none opacity-0"}`}>
          {[
            { label: muted ? "Activer le son" : "Couper le son", icon: <SoundIcon muted={muted} />, onClick: () => setMuted((m) => !m), text: muted ? "Son coupé" : "Son" },
            { label: "Liste des épisodes", icon: <GridIcon width={22} height={22} />, onClick: () => setSheet("episodes"), text: "Épisodes" },
            { label: "Plein écran", icon: <FullscreenIcon width={22} height={22} />, onClick: toggleFullscreen, text: "Plein écran" },
          ].map((b) => (
            <button key={b.text} type="button" aria-label={b.label} onClick={() => { b.onClick(); showControls(); }} className="flex flex-col items-center gap-1 text-[10px] font-medium [text-shadow:0_1px_3px_rgba(0,0,0,.8)]">
              <span className="grid size-11 place-items-center rounded-full bg-black/35 backdrop-blur-sm">{b.icon}</span>
              {b.text}
            </button>
          ))}
        </div>

        {hint && active === initialIndex && slides.length > 1 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-20 z-40 flex flex-col items-center text-[13px] text-white/90 [text-shadow:0_1px_3px_rgba(0,0,0,.8)]">
            <ChevronDownIcon width={22} height={22} className="rotate-180 animate-bounce" />
            Glissez vers le haut pour l&apos;épisode suivant
          </div>
        ) : null}

        {toast ? (
          <div className="pointer-events-none absolute inset-x-0 top-16 z-50 flex justify-center px-4" role="status">
            <span className="rounded-full bg-black/70 px-4 py-2 text-[13px] backdrop-blur">{toast}</span>
          </div>
        ) : null}

        {sheet === "episodes" ? (
          <EpisodesSheet
            title={`Épisodes · ${seriesTitle}`}
            slides={slides}
            activeIndex={active}
            progress={progress}
            onPick={(i) => { setSheet(null); goTo(i); }}
            onClose={() => setSheet(null)}
          />
        ) : null}
        {sheet && sheet !== "episodes" ? (
          <PurchaseSheet
            label={sheet.label}
            description={sheet.kind === "pass" ? "Tous les épisodes de la série, y compris les prochains" : "Cet épisode uniquement"}
            amount={sheet.amount}
            onDone={() => completePurchase(sheet)}
            onClose={() => setSheet(null)}
          />
        ) : null}
      </div>

      {/* Ordinateur : boutons précédent / suivant */}
      <div className="absolute right-6 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
        <button type="button" aria-label="Épisode précédent" onClick={() => goTo(active - 1)} className="grid size-12 place-items-center rounded-full bg-white/10 hover:bg-white/20">
          <ChevronDownIcon width={24} height={24} className="rotate-180" />
        </button>
        <button type="button" aria-label="Épisode suivant" onClick={() => goTo(active + 1)} className="grid size-12 place-items-center rounded-full bg-white/10 hover:bg-white/20">
          <ChevronDownIcon width={24} height={24} />
        </button>
      </div>
      <p className="absolute bottom-4 left-6 z-40 hidden text-[12px] text-white/50 lg:block">↑ ↓ pour changer d&apos;épisode · M pour le son · Échap pour quitter</p>
    </div>
  );
}

