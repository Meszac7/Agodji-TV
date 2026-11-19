import { LockIcon } from "@/components/ui/icons";
import { formatPrice } from "@/lib/money";

/** Diapositive de déblocage (FR-38) : jamais de lecture ni de paiement automatique. */
export function LockedSlide({
  poster,
  episodeLabel,
  episodeTitle,
  prices,
  onChoose,
}: {
  poster: string;
  episodeLabel: string;
  episodeTitle: string;
  prices: { episode: number; pass: number };
  onChoose: (kind: "pass" | "episode") => void;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black text-white" data-testid="locked-slide">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={poster} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-75 blur-xl" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/85" />
      <div className="relative z-10 flex h-full flex-col items-center justify-end gap-3 px-5 pb-16 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-white/10 backdrop-blur">
          <LockIcon width={26} height={26} />
        </span>
        <p className="text-[13px] uppercase tracking-[0.14em] text-white/70">{episodeLabel}</p>
        <h2 className="font-display text-2xl font-bold">{episodeTitle}</h2>
        <p className="max-w-xs text-[14px] text-white/75">Cet épisode fait partie du contenu payant.</p>
        <button
          type="button"
          onClick={() => onChoose("pass")}
          className="mt-3 w-full max-w-sm rounded-[var(--radius-control)] bg-primary px-4 py-3 text-on-primary"
        >
          <span className="block font-display text-base font-bold">Débloquer toute la série — {formatPrice(prices.pass, "XOF")}</span>
          <span className="block text-[12px] font-medium opacity-80">Pass série · tous les épisodes, y compris les prochains</span>
        </button>
        <button
          type="button"
          onClick={() => onChoose("episode")}
          className="w-full max-w-sm rounded-[var(--radius-control)] border border-white/30 bg-white/10 px-4 py-3 font-display font-bold backdrop-blur"
        >
          Seulement cet épisode — {formatPrice(prices.episode, "XOF")}
        </button>
        <p className="text-[12px] text-white/60">Achat définitif · sans expiration</p>
      </div>
    </div>
  );
}
