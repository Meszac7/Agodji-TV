"use client";

import { useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon } from "@/components/ui/icons";
import { formatClock } from "@/lib/player/local-progress";

/**
 * Diapositive d'un épisode lisible : affichage entier (contain) sur fond flou, toucher = pause/lecture,
 * barre de progression. Le moteur de diffusion réel (HLS adaptatif, liens signés) remplacera la balise
 * <video> simple de cette maquette sans changer l'interface.
 */
export function EpisodeSlide({
  src,
  poster,
  active,
  mountVideo,
  muted,
  orientation,
  resumeAt,
  onProgress,
  onEnded,
  onTap,
}: {
  src: string;
  poster: string;
  active: boolean;
  mountVideo: boolean;
  muted: boolean;
  orientation: "portrait" | "landscape";
  resumeAt: number;
  onProgress: (position: number, duration: number) => void;
  onEnded: () => void;
  onTap: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [flash, setFlash] = useState<"play" | "pause" | null>(null);
  const [time, setTime] = useState({ current: 0, duration: 0 });
  const [scrubbing, setScrubbing] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (active && !paused) {
      v.play().catch(() => setPaused(true));
    } else {
      v.pause();
    }
  }, [active, paused, mountVideo]);

  useEffect(() => {
    if (!active) setPaused(false);
  }, [active]);

  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);

  function toggle() {
    const next = !paused;
    setPaused(next);
    setFlash(next ? "pause" : "play");
    window.setTimeout(() => setFlash(null), 600);
    onTap();
  }

  function seekFromPointer(clientX: number, el: HTMLElement) {
    const v = ref.current;
    if (!v || !v.duration) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    v.currentTime = ratio * v.duration;
  }

  const ratio = time.duration ? time.current / time.duration : 0;

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {/* Fond flou : comble les zones vides sans jamais recadrer ni déformer la vidéo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={poster} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-2xl" />
      <button type="button" aria-label={paused ? "Lecture" : "Pause"} onClick={toggle} className="absolute inset-0 z-10 cursor-default" data-testid="tap-zone" />
      {mountVideo ? (
        <video
          ref={ref}
          poster={poster}
          playsInline
          preload={active ? "auto" : "metadata"}
          className={`absolute inset-0 h-full w-full object-contain ${orientation === "landscape" ? "" : ""}`}
          data-testid={active ? "active-video" : undefined}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            if (resumeAt > 0 && resumeAt < v.duration * 0.95) v.currentTime = resumeAt;
            setTime({ current: v.currentTime, duration: v.duration });
          }}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            setTime({ current: v.currentTime, duration: v.duration });
            onProgress(v.currentTime, v.duration);
          }}
          onEnded={onEnded}
        >
          {/* Maquette : WebM puis MP4. Le vrai lecteur utilisera le flux HLS adaptatif. */}
          <source src={src.replace(/\.mp4$/, ".webm")} type="video/webm" />
          <source src={src} type="video/mp4" />
        </video>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" className="absolute inset-0 h-full w-full object-contain" />
      )}

      {flash ? (
        <span className="pointer-events-none absolute left-1/2 top-1/2 z-20 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white">
          {flash === "pause" ? <PauseIcon width={34} height={34} /> : <PlayIcon width={34} height={34} />}
        </span>
      ) : null}
      {paused && !flash ? (
        <span className="pointer-events-none absolute left-1/2 top-1/2 z-20 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white/90">
          <PlayIcon width={28} height={28} />
        </span>
      ) : null}

      {/* Barre de progression : fine, s'épaissit au toucher */}
      <div className="absolute inset-x-0 bottom-0 z-30 px-3 pb-[max(10px,env(safe-area-inset-bottom))]">
        <div className="mb-1.5 flex justify-between text-[11px] tabular-nums text-white/75 [text-shadow:0_1px_2px_rgba(0,0,0,.7)]">
          <span>{formatClock(time.current)}</span>
          <span>{formatClock(time.duration)}</span>
        </div>
        <div
          role="slider"
          aria-label="Position dans l'épisode"
          aria-valuemin={0}
          aria-valuemax={Math.round(time.duration)}
          aria-valuenow={Math.round(time.current)}
          tabIndex={0}
          className="group relative flex h-5 cursor-pointer items-center"
          onPointerDown={(e) => {
            setScrubbing(true);
            e.currentTarget.setPointerCapture(e.pointerId);
            seekFromPointer(e.clientX, e.currentTarget);
          }}
          onPointerMove={(e) => scrubbing && seekFromPointer(e.clientX, e.currentTarget)}
          onPointerUp={() => setScrubbing(false)}
        >
          <div className={`relative w-full rounded-full bg-white/25 transition-[height] ${scrubbing ? "h-1.5" : "h-0.5 group-hover:h-1.5"}`}>
            <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${ratio * 100}%` }} />
          </div>
          <div
            className={`absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow transition-opacity ${scrubbing ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
            style={{ left: `${ratio * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
