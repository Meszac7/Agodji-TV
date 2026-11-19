"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadProgress, saveProgress, type Progress } from "@/lib/player/local-progress";
import { buildSlides, isCompleted, resumeIndex, type Entitlements, type OtherSeries } from "@/lib/player/sequencer";
import type { PlaybackErrorKind, PlaybackGrant } from "@/lib/player/stream-url";
import type { SeriesFeed } from "@/server/catalog/series-feed";
import { resumeLabelFor, SeriesPageView } from "./feed/SeriesViews";
import { PurchaseUnavailableSheet } from "./feed/Sheets";
import { GrantError } from "./feed/useEpisodeStream";
import { VerticalFeed } from "./feed/VerticalFeed";

const NO_RIGHTS: Entitlements = { seriesPassIds: new Set(), episodeIds: new Set() };

/** Lien de lecture : le serveur vérifie le droit avant de le signer (jamais le navigateur). */
async function fetchGrant(episodeId: string, purpose: "start" | "renew" | "preload"): Promise<PlaybackGrant> {
  let res: Response;
  try {
    res = await fetch(`/api/playback/${episodeId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose }),
      cache: "no-store",
    });
  } catch {
    throw new GrantError(navigator.onLine ? "network" : "offline");
  }
  if (res.ok) return (await res.json()) as PlaybackGrant;
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  const known: PlaybackErrorKind[] = ["locked", "not_found", "not_ready", "rate_limited"];
  throw new GrantError(known.includes(body.error as PlaybackErrorKind) ? (body.error as PlaybackErrorKind) : "unavailable");
}

/**
 * Fiche série + lecteur vertical réels : écrans de la maquette V2 validée, alimentés par la base.
 * Étape L1 : visiteurs sans compte, épisodes gratuits lisibles, progression mémorisée sur l'appareil.
 */
export function SeriesExperience({ feed }: { feed: SeriesFeed }) {
  const router = useRouter();
  const [view, setView] = useState<"series" | "player">("series");
  const [buying, setBuying] = useState(false);
  const storageKey = `agodjie-progression-${feed.slug}`;
  const [progress, setProgress] = useState<Progress>(new Map());

  useEffect(() => {
    setProgress(loadProgress(storageKey));
  }, [storageKey, view]);

  const slides = useMemo(() => buildSlides(feed.series, NO_RIGHTS, feed.otherSeries), [feed]);
  const startIndex = resumeIndex(slides, progress);
  const media = useMemo(
    () => Object.fromEntries(Object.entries(feed.thumbnails).map(([id, poster]) => [id, { poster }])),
    [feed.thumbnails],
  );

  const onProgressChange = useCallback(
    (episodeId: string, position: number, duration: number) => {
      setProgress((prev) => {
        const next = new Map(prev);
        next.set(episodeId, { positionSeconds: position, completed: isCompleted(position, duration), updatedAt: Date.now() });
        saveProgress(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  const openOther = (s: OtherSeries) => router.push(s.available ? `/series/${s.slug}` : `/series?bientot=${encodeURIComponent(s.slug)}`);

  if (view === "player") {
    return (
      <VerticalFeed
        seriesTitle={feed.title}
        orientation={feed.orientation}
        series={feed.series}
        otherSeries={feed.otherSeries}
        media={media}
        prices={feed.prices ?? { pass: 0, episodes: {} }}
        initialEntitlements={NO_RIGHTS}
        initialIndex={startIndex}
        progress={progress}
        onProgressChange={onProgressChange}
        onExit={() => setView("series")}
        onOpenSeries={openOther}
        onCatalog={() => router.push("/series")}
        fetchGrant={fetchGrant}
        purchaseMode="unavailable"
      />
    );
  }

  return (
    <SeriesPageView
      badge={`Prix indicatifs · ${feed.displayCountry.name}`}
      onLogo={() => router.push("/series")}
      title={feed.title}
      synopsis={feed.synopsis}
      poster={feed.poster}
      series={feed.series}
      ent={NO_RIGHTS}
      progress={progress}
      prices={feed.prices}
      resumeLabel={resumeLabelFor(slides, progress, startIndex)}
      onPlay={() => setView("player")}
      onBuyPass={() => setBuying(true)}
    >
      {buying && feed.prices ? (
        <PurchaseUnavailableSheet label={`Pass série · ${feed.title}`} amount={feed.prices.pass} onClose={() => setBuying(false)} />
      ) : null}
    </SeriesPageView>
  );
}
