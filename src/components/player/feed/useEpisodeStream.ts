"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type Hls from "hls.js";
import { pickLevel, variantUrlFor, type QualityMode } from "@/lib/player/quality";
import {
  needsRenewal,
  retryDelayMs,
  rewriteToCurrentGrant,
  signedDir,
  type PlaybackErrorKind,
  type PlaybackGrant,
} from "@/lib/player/stream-url";

/** Demande d'un lien de lecture au serveur (qui vérifie le droit d'accès). */
export type GrantFetcher = (episodeId: string, purpose: "start" | "renew" | "preload") => Promise<PlaybackGrant>;

export class GrantError extends Error {
  constructor(readonly kind: PlaybackErrorKind) {
    super(kind);
  }
}

const MAX_NETWORK_RETRIES = 4;

/**
 * Moteur de diffusion d'un épisode (couche 2, TECHNICAL_ARCHITECTURE §6.4) :
 * - HLS natif sur Safari / iPhone, hls.js ailleurs ; qualité adaptative limitée à la taille du lecteur ;
 * - préchargement léger (début de l'épisode suivant uniquement) ;
 * - lien signé renouvelé avant expiration, sans interrompre la lecture ;
 * - nouvelles tentatives en cas de coupure réseau, reprise au retour de la connexion.
 * Ne connaît ni les prix ni les achats : il demande un lien, le serveur décide.
 */
export function useEpisodeStream({
  videoRef,
  episodeId,
  enabled,
  active,
  fetchGrant,
  quality = "auto",
  onStall,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  episodeId: string;
  /** Vrai pour l'épisode courant et le suivant (préchargement). */
  enabled: boolean;
  active: boolean;
  fetchGrant: GrantFetcher;
  /** Qualité choisie par le spectateur ; « auto » = adaptation au débit (par défaut). */
  quality?: QualityMode;
  /** Coupure de lecture (mise en mémoire tampon) pendant la lecture, avec sa durée. */
  onStall?: (durationMs: number) => void;
}) {
  const [error, setError] = useState<PlaybackErrorKind | null>(null);
  const [attachedAt, setAttachedAt] = useState(0);
  /** Incrémenté par « Réessayer » quand le flux n'a jamais pu être attaché. */
  const [attempt, setAttempt] = useState(0);
  const grant = useRef<PlaybackGrant | null>(null);
  const dirs = useRef<string[]>([]);
  const hls = useRef<Hls | null>(null);
  const native = useRef(false);
  const retries = useRef(0);
  const renewing = useRef<Promise<PlaybackGrant | null> | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const qualityRef = useRef<QualityMode>(quality);
  qualityRef.current = quality;
  const onStallRef = useRef(onStall);
  onStallRef.current = onStall;

  /** Lecture native : la qualité imposée se choisit en ouvrant directement la variante voulue. */
  const nativeSource = useCallback(async (g: PlaybackGrant): Promise<string> => {
    if (qualityRef.current === "auto") return g.url;
    try {
      const res = await fetch(g.url, { cache: "no-store" });
      return res.ok ? variantUrlFor(await res.text(), g.url, qualityRef.current) : g.url;
    } catch {
      return g.url;
    }
  }, []);

  const remember = useCallback((g: PlaybackGrant) => {
    grant.current = g;
    const dir = signedDir(g.url);
    if (!dirs.current.includes(dir)) dirs.current = [...dirs.current, dir];
  }, []);

  const renew = useCallback(async (): Promise<PlaybackGrant | null> => {
    renewing.current ??= fetchGrant(episodeId, "renew")
      .then((g) => {
        remember(g);
        return g;
      })
      .catch((e: unknown) => {
        setError(e instanceof GrantError ? e.kind : "network");
        return null;
      })
      .finally(() => {
        renewing.current = null;
      });
    return renewing.current;
  }, [episodeId, fetchGrant, remember]);

  // Attache le flux quand l'épisode devient courant ou suivant.
  useEffect(() => {
    const video = videoRef.current;
    if (!enabled || !video) return;
    let cancelled = false;
    let retryTimer: number | undefined;

    const scheduleRetry = (fn: () => void) => {
      retries.current += 1;
      if (retries.current > MAX_NETWORK_RETRIES) {
        setError(navigator.onLine ? "network" : "offline");
        return;
      }
      retryTimer = window.setTimeout(fn, retryDelayMs(retries.current));
    };

    (async () => {
      try {
        const g = grant.current && !needsRenewal(grant.current.expiresAt) ? grant.current : await fetchGrant(episodeId, activeRef.current ? "start" : "preload");
        if (cancelled) return;
        remember(g);
        const { default: HlsCtor } = await import("hls.js");
        if (cancelled) return;
        const appleNative = video.canPlayType("application/vnd.apple.mpegurl") !== "" && /apple/i.test(navigator.vendor);
        if (HlsCtor.isSupported() && !appleNative) {
          // Un 401/403 signifie « lien expiré » : on retente (le lien est renouvelé entre-temps)
          // au lieu d'abandonner la qualité en cours, ce que ferait hls.js par défaut pour une erreur 4xx.
          type Policy = typeof HlsCtor.DefaultConfig.fragLoadPolicy;
          const retryExpired = (policy: Policy): Policy => ({
            default: {
              ...policy.default,
              errorRetry: {
                ...(policy.default.errorRetry ?? { maxNumRetry: 3, retryDelayMs: 500, maxRetryDelayMs: 4000 }),
                retryDelayMs: 500,
                shouldRetry: (_config, count, _timeout, response, retry) =>
                  retry || ((response?.code === 403 || response?.code === 401) && count < 3),
              },
            },
          });
          const instance = new HlsCtor({
            // En automatique, la qualité ne dépasse pas la taille de l'écran ; en manuel, le choix du spectateur prime.
            capLevelToPlayerSize: qualityRef.current === "auto",
            fragLoadPolicy: retryExpired(HlsCtor.DefaultConfig.fragLoadPolicy),
            playlistLoadPolicy: retryExpired(HlsCtor.DefaultConfig.playlistLoadPolicy),
            maxBufferLength: activeRef.current ? 30 : 4,
            maxMaxBufferLength: activeRef.current ? 60 : 4,
            // Chaque requête utilise le jeton le plus récent (renouvellement transparent).
            xhrSetup: (xhr, url) => {
              xhr.open("GET", rewriteToCurrentGrant(url, dirs.current, signedDir(grant.current!.url)), true);
            },
          });
          hls.current = instance;
          instance.on(HlsCtor.Events.FRAG_LOADED, () => {
            retries.current = 0;
          });
          instance.on(HlsCtor.Events.ERROR, (_event, data) => {
            const code = data.response?.code;
            const expired = code === 403 || code === 401;
            // Lien expiré : nouveau lien ; les requêtes suivantes sont réécrites vers lui (xhrSetup).
            if (expired && !data.fatal) {
              void renew();
              return;
            }
            if (!data.fatal) return;
            if (data.type === HlsCtor.ErrorTypes.NETWORK_ERROR) {
              if (expired) {
                void renew().then((g) => g && instance.startLoad(video.currentTime));
                return;
              }
              scheduleRetry(() => instance.startLoad(video.currentTime));
              return;
            }
            if (data.type === HlsCtor.ErrorTypes.MEDIA_ERROR && retries.current < 2) {
              retries.current += 1;
              instance.recoverMediaError();
              return;
            }
            setError("media");
          });
          instance.on(HlsCtor.Events.MANIFEST_PARSED, () => {
            const idx = pickLevel(instance.levels.map((l) => ({ width: l.width, height: l.height, codecs: l.videoCodec })), qualityRef.current);
            if (idx >= 0) instance.currentLevel = idx;
          });
          instance.loadSource(g.url);
          instance.attachMedia(video);
        } else if (appleNative || video.canPlayType("application/vnd.apple.mpegurl")) {
          native.current = true;
          video.src = await nativeSource(g);
        } else {
          setError("media");
          return;
        }
        setAttachedAt(Date.now());
      } catch (e) {
        if (cancelled) return;
        if (e instanceof GrantError) setError(e.kind);
        else setError(navigator.onLine ? "network" : "offline");
      }
    })();

    // Lecture native (Safari) : sur erreur, nouveau lien et reprise au même endroit.
    const onNativeError = () => {
      if (!native.current) return;
      const at = video.currentTime;
      scheduleRetry(() => {
        void renew().then(async (g) => {
          if (!g) return;
          video.src = await nativeSource(g);
          video.currentTime = at;
          if (activeRef.current) void video.play().catch(() => undefined);
        });
      });
    };
    video.addEventListener("error", onNativeError);

    // Coupures de lecture (tampon vide) pendant que l'épisode est regardé.
    let stallStart = 0;
    let longStallTimer: number | undefined;
    const onWaiting = () => {
      if (!activeRef.current || video.seeking || video.currentTime < 0.5 || stallStart) return;
      stallStart = Date.now();
      longStallTimer = window.setTimeout(() => {
        if (stallStart) onStallRef.current?.(Date.now() - stallStart);
      }, 4_000);
    };
    const onPlaying = () => {
      window.clearTimeout(longStallTimer);
      if (stallStart) {
        const duration = Date.now() - stallStart;
        stallStart = 0;
        if (duration < 4_000) onStallRef.current?.(duration);
      }
    };
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);

    return () => {
      cancelled = true;
      // Le flux est détaché : la lecture ne doit pas être relancée avant le prochain attachement.
      setAttachedAt(0);
      window.clearTimeout(retryTimer);
      video.removeEventListener("error", onNativeError);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      window.clearTimeout(longStallTimer);
      hls.current?.destroy();
      hls.current = null;
      if (native.current) {
        video.removeAttribute("src");
        video.load();
        native.current = false;
      }
    };
  }, [enabled, episodeId, fetchGrant, remember, renew, videoRef, attempt, nativeSource]);

  // Changement de qualité pendant la lecture : appliqué sans recommencer l'épisode.
  useEffect(() => {
    const instance = hls.current;
    const video = videoRef.current;
    if (instance) {
      instance.capLevelToPlayerSize = quality === "auto";
      const idx = pickLevel(instance.levels.map((l) => ({ width: l.width, height: l.height, codecs: l.videoCodec })), quality);
      instance.nextLevel = idx; // -1 = retour à l'adaptation automatique ; sinon bascule au prochain segment
    } else if (native.current && video && grant.current) {
      const at = video.currentTime;
      const wasPlaying = !video.paused;
      void nativeSource(grant.current).then((src) => {
        video.src = src;
        video.currentTime = at;
        if (wasPlaying) void video.play().catch(() => undefined);
      });
    }
  }, [quality, videoRef, nativeSource]);

  // Le préchargement devient lecture : on autorise un tampon normal.
  useEffect(() => {
    const instance = hls.current;
    if (instance && active) {
      instance.config.maxBufferLength = 30;
      instance.config.maxMaxBufferLength = 60;
    }
  }, [active, attachedAt]);

  // Renouvellement préventif tant que l'épisode est affiché (pause prolongée comprise).
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => {
      const g = grant.current;
      if (g && needsRenewal(g.expiresAt)) void renew();
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [enabled, renew]);

  // Coupure puis retour du réseau.
  useEffect(() => {
    const onOffline = () => setError((e) => e ?? "offline");
    const onOnline = () => {
      if (!enabled) return;
      setError(null);
      retries.current = 0;
      hls.current?.startLoad(videoRef.current?.currentTime ?? -1);
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [enabled, videoRef]);

  /** « Réessayer » : on repart d'un lien neuf, au même endroit. */
  const retry = useCallback(() => {
    setError(null);
    retries.current = 0;
    const video = videoRef.current;
    if (!hls.current && !native.current) {
      // Le flux n'a jamais été attaché (lien refusé ou service indisponible) : on recommence depuis le début.
      grant.current = null;
      setAttempt((a) => a + 1);
      return;
    }
    void renew().then(async (g) => {
      if (!g || !video) return;
      if (hls.current) {
        hls.current.loadSource(g.url);
        hls.current.startLoad(video.currentTime);
      } else if (native.current) {
        const at = video.currentTime;
        video.src = await nativeSource(g);
        video.currentTime = at;
      }
      if (activeRef.current) void video.play().catch(() => undefined);
    });
  }, [renew, videoRef, nativeSource]);

  /** À appeler avant de relancer la lecture après une longue pause. */
  const ensureFresh = useCallback(async () => {
    const g = grant.current;
    if (g && needsRenewal(g.expiresAt)) await renew();
  }, [renew]);

  return { error, retry, ensureFresh, attachedAt };
}
