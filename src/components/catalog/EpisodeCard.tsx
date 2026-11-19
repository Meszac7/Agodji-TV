import { PosterArt } from "@/components/brand/PosterArt";
import { Badge } from "@/components/ui/Badge";
import { LockIcon, PlayIcon } from "@/components/ui/icons";
import { formatDuration, type DemoEpisode, type DemoSeries } from "@/lib/demo/catalog";
import { formatPrice, type CurrencyCode } from "@/lib/money";

export function EpisodeCard({
  series,
  episode,
  price,
}: {
  series: DemoSeries;
  episode: DemoEpisode;
  price: { amount: number; currency: CurrencyCode };
}) {
  const accessible = episode.access === "free" || Boolean(episode.demoOwnership);
  const vertical = series.orientation === "portrait";
  return (
    <article className="flex gap-3 rounded-[var(--radius-card)] p-2 transition-colors hover:bg-surface">
      <div
        className={`relative shrink-0 overflow-hidden rounded-[10px] ${vertical ? "aspect-[9/16] w-[84px]" : "aspect-video w-[136px] sm:w-[176px]"}`}
      >
        <PosterArt palette={series.palette} title={series.title} showTitle={false} className="h-full w-full" />
        <span className="absolute inset-0 grid place-items-center">
          <span
            className={`grid size-10 place-items-center rounded-full ${accessible ? "bg-primary text-on-primary" : "bg-overlay text-text backdrop-blur-sm"}`}
          >
            {accessible ? <PlayIcon width={18} height={18} /> : <LockIcon width={18} height={18} />}
          </span>
        </span>
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <p className="text-[12px] font-medium text-muted tabular-nums">
          Épisode {episode.number} · {formatDuration(episode.durationSeconds)}
        </p>
        <h3 className="mt-0.5 line-clamp-1 font-display text-base font-semibold">{episode.title}</h3>
        <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted">{episode.synopsis}</p>
        <div className="mt-2">
          {episode.access === "free" ? (
            <Badge kind="free">Gratuit</Badge>
          ) : episode.demoOwnership === "owned" ? (
            <Badge kind="owned">Acheté</Badge>
          ) : episode.demoOwnership === "pass" ? (
            <Badge kind="pass">Inclus dans votre pass</Badge>
          ) : (
            <Badge kind="price">{formatPrice(price.amount, price.currency)}</Badge>
          )}
        </div>
      </div>
    </article>
  );
}
