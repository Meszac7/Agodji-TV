import { PosterArt } from "@/components/brand/PosterArt";
import { FullscreenIcon, ForwardIcon, PauseIcon, RewindIcon } from "@/components/ui/icons";
import type { PosterPalette } from "@/lib/demo/catalog";

/**
 * Aperçu statique de l'habillage du lecteur (identité visuelle uniquement).
 * Le lecteur fonctionnel (PRODUCT_REQUIREMENTS §5) est construit à l'étape 2.
 * Le lecteur est toujours sur fond noir, quel que soit le thème.
 */
export function PlayerPreview({ palette, title }: { palette: PosterPalette; title: string }) {
  return (
    <div className="relative aspect-video w-full max-w-[720px] overflow-hidden rounded-[var(--radius-card)] bg-black text-white">
      <div className="absolute inset-0 opacity-80">
        <PosterArt palette={palette} title={title} showTitle={false} className="h-full w-full" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3 md:p-4">
        <div>
          <p className="text-[12px] text-white/70">{title} · Épisode 3</p>
          <p className="font-display text-base font-semibold">Les Masques</p>
        </div>
        <span className="rounded-[6px] border border-white/30 px-2 py-0.5 text-[12px]">Auto</span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center gap-8 md:gap-14">
        <span className="grid size-11 place-items-center rounded-full bg-black/40" aria-hidden>
          <RewindIcon />
        </span>
        <span className="grid size-16 place-items-center rounded-full bg-primary text-on-primary" aria-hidden>
          <PauseIcon width={26} height={26} />
        </span>
        <span className="grid size-11 place-items-center rounded-full bg-black/40" aria-hidden>
          <ForwardIcon />
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-3 md:p-4">
        <div className="relative h-1.5 rounded-full bg-white/25">
          <div className="absolute inset-y-0 left-0 w-[58%] rounded-full bg-white/40" />
          <div className="absolute inset-y-0 left-0 w-[42%] rounded-full bg-primary" />
          <div className="absolute top-1/2 left-[42%] size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow" />
        </div>
        <div className="mt-2 flex items-center justify-between text-[12px] tabular-nums text-white/80">
          <span>05:35 / 13:18</span>
          <FullscreenIcon width={18} height={18} />
        </div>
      </div>
    </div>
  );
}
