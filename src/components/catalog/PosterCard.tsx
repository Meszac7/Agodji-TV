import { PosterArt } from "@/components/brand/PosterArt";
import { Badge } from "@/components/ui/Badge";
import type { DemoSeries } from "@/lib/demo/catalog";

export function PosterCard({ series }: { series: DemoSeries }) {
  const soon = series.status === "coming_soon";
  return (
    <a
      href={`#serie-${series.slug}`}
      className="group block w-[42vw] max-w-[180px] shrink-0 snap-start sm:w-auto sm:max-w-none"
      aria-label={`${series.title}${soon ? " — bientôt disponible" : ""}`}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-[var(--radius-card)] bg-surface transition-transform duration-200 group-hover:-translate-y-1">
        <PosterArt
          palette={series.palette}
          title={series.title}
          className={`h-full w-full ${soon ? "saturate-[0.55] brightness-[0.8]" : ""}`}
        />
        {soon ? (
          <div className="absolute left-2 top-2">
            <Badge kind="soon">Bientôt</Badge>
          </div>
        ) : null}
      </div>
      <p className="mt-2 line-clamp-1 font-display text-[15px] font-semibold">{series.title}</p>
      <p className="line-clamp-1 text-[12px] text-muted">
        {soon ? series.releaseLabel : `${series.seasons} saison · ${series.genres.join(", ")}`}
      </p>
    </a>
  );
}
