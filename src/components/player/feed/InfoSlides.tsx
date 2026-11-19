import { CheckIcon, GridIcon } from "@/components/ui/icons";
import type { OtherSeries } from "@/lib/player/sequencer";

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

/** Épisode annoncé, pas encore publié (FR-41) : jamais lisible avant sa date. */
export function ScheduledSlide({ poster, label, title, date, coveredByPass }: { poster: string; label: string; title: string; date: string; coveredByPass: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black text-white" data-testid="scheduled-slide">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={poster} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-xl" />
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-[13px] uppercase tracking-[0.14em] text-white/70">{label}</p>
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        <p className="rounded-full bg-white/10 px-4 py-1.5 text-[14px] backdrop-blur">Disponible le {shortDate(date)}</p>
        {coveredByPass ? (
          <p className="flex items-center gap-1.5 text-[14px] text-success">
            <CheckIcon width={16} height={16} /> Inclus dans votre pass série
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Fin de série (FR-42) : autres séries + retour au catalogue.
 * Jamais de « saison suivante » : une nouvelle histoire est une nouvelle série avec son propre pass.
 */
export function SeriesEndSlide({
  seriesTitle,
  nextScheduledAt,
  otherSeries,
  onOpenSeries,
  onCatalog,
}: {
  seriesTitle: string;
  nextScheduledAt: string | null;
  otherSeries: OtherSeries[];
  onOpenSeries: (s: OtherSeries) => void;
  onCatalog: () => void;
}) {
  return (
    <div
      className="absolute inset-0 flex flex-col justify-center gap-5 overflow-y-auto bg-black px-5 py-16 text-white"
      style={{ backgroundImage: "radial-gradient(120% 60% at 50% 10%, color-mix(in srgb, var(--primary) 20%, transparent) 0%, transparent 60%)" }}
      data-testid="series-end-slide"
    >
      <div className="text-center">
        <p className="text-[13px] uppercase tracking-[0.14em] text-white/60">{seriesTitle}</p>
        <h2 className="mt-1 font-display text-3xl font-extrabold">Fin de la série</h2>
        {nextScheduledAt ? (
          <p className="mt-2 text-[14px] text-white/75" data-testid="next-episode-notice">
            Prochain épisode le {shortDate(nextScheduledAt)}
          </p>
        ) : null}
      </div>
      {otherSeries.length > 0 ? (
        <div>
          <p className="mb-2 font-display text-base font-bold">D&apos;autres séries à découvrir</p>
          <div className="no-scrollbar -mx-5 flex snap-x scroll-px-5 gap-3 overflow-x-auto px-5">
            {otherSeries.map((s) => (
              <button key={s.id} type="button" onClick={() => onOpenSeries(s)} className="w-[34%] max-w-[140px] shrink-0 snap-start text-left">
                <span className="relative block aspect-[2/3] overflow-hidden rounded-[10px] bg-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.poster} alt="" className="h-full w-full object-cover" />
                  {!s.available ? (
                    <span className="absolute left-1.5 top-1.5 rounded-[6px] bg-black/60 px-1.5 py-0.5 text-[11px]">Bientôt</span>
                  ) : null}
                </span>
                <span className="mt-1.5 line-clamp-1 block text-[13px] font-medium">{s.title}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <button
        type="button"
        onClick={onCatalog}
        className="mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary py-3 font-display font-bold text-on-primary"
      >
        <GridIcon width={18} height={18} /> Retour au catalogue
      </button>
    </div>
  );
}
