import { CheckIcon, PlayIcon } from "@/components/ui/icons";
import { formatPrice } from "@/lib/money";

/** Épisode annoncé, pas encore publié (FR-41) : jamais lisible avant sa date. */
export function ScheduledSlide({ poster, label, title, date, coveredByPass }: { poster: string; label: string; title: string; date: string; coveredByPass: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black text-white" data-testid="scheduled-slide">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={poster} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-xl" />
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-[13px] uppercase tracking-[0.14em] text-white/70">{label}</p>
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        <p className="rounded-full bg-white/10 px-4 py-1.5 text-[14px] backdrop-blur">Disponible le {date}</p>
        {coveredByPass ? (
          <p className="flex items-center gap-1.5 text-[14px] text-success">
            <CheckIcon width={16} height={16} /> Inclus dans votre pass
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Fin de saison (FR-42) : ne laisse jamais croire qu'un pass couvre une autre saison. */
export function SeasonEndSlide({
  seriesTitle,
  seasonNumber,
  next,
  currentPassOwned,
  nextPassPrice,
  onUnlockNext,
  onWatchNextFree,
  onBack,
}: {
  seriesTitle: string;
  seasonNumber: number;
  next: null | { number: number; unlocked: boolean; firstEpisodeFree: boolean };
  currentPassOwned: boolean;
  nextPassPrice: number;
  onUnlockNext: () => void;
  onWatchNextFree: () => void;
  onBack: () => void;
}) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white"
      style={{ backgroundImage: "radial-gradient(120% 60% at 50% 15%, color-mix(in srgb, var(--primary) 22%, transparent) 0%, transparent 65%)" }}
      data-testid="season-end-slide"
    >
      <p className="text-[13px] uppercase tracking-[0.14em] text-white/60">{seriesTitle}</p>
      <h2 className="font-display text-3xl font-extrabold">Saison {seasonNumber} terminée</h2>
      {next ? (
        <div className="mt-2 w-full max-w-sm rounded-[var(--radius-card)] border border-white/15 bg-white/5 p-4 text-left backdrop-blur">
          <p className="font-display text-lg font-bold">Découvrir la saison {next.number}</p>
          {next.unlocked ? (
            <button type="button" onClick={onWatchNextFree} className="mt-3 flex w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary py-3 font-display font-bold text-on-primary">
              <PlayIcon width={18} height={18} /> Regarder la saison {next.number}
            </button>
          ) : (
            <>
              {currentPassOwned ? (
                <p className="mt-1 text-[13px] text-white/70" data-testid="pass-scope-notice">
                  Votre pass Saison {seasonNumber} ne couvre pas la saison {next.number}.
                </p>
              ) : null}
              {next.firstEpisodeFree ? (
                <button type="button" onClick={onWatchNextFree} className="mt-3 flex w-full items-center justify-center gap-2 rounded-[var(--radius-control)] border border-white/30 bg-white/10 py-3 font-display font-bold">
                  <PlayIcon width={18} height={18} /> Regarder l&apos;épisode 1 — Gratuit
                </button>
              ) : null}
              <button type="button" onClick={onUnlockNext} className="mt-3 w-full rounded-[var(--radius-control)] bg-primary py-3 font-display font-bold text-on-primary">
                Débloquer la saison {next.number} — {formatPrice(nextPassPrice, "XOF")}
              </button>
            </>
          )}
        </div>
      ) : (
        <p className="max-w-xs text-white/75">Vous êtes à jour. Le prochain épisode sera annoncé ici.</p>
      )}
      <button type="button" onClick={onBack} className="mt-2 text-[14px] text-white/70 underline underline-offset-4">
        Retour à la fiche de la série
      </button>
    </div>
  );
}
