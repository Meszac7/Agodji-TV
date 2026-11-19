import { PosterArt } from "@/components/brand/PosterArt";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PlayIcon } from "@/components/ui/icons";
import type { DemoSeries } from "@/lib/demo/catalog";
import { formatMinutes } from "@/lib/player/sequencer";

export function Hero({ series }: { series: DemoSeries }) {
  return (
    <section
      data-theme="dark"
      className="relative isolate min-h-[68vh] overflow-hidden bg-bg text-text md:min-h-[560px]"
      aria-label={`À la une : ${series.title}`}
    >
      <div className="absolute inset-0 -z-10">
        <PosterArt palette={series.palette} title={series.title} showTitle={false} className="h-full w-full" />
      </div>
      <div className="absolute inset-0 -z-10" style={{ backgroundImage: "var(--hero-fade)" }} />
      <div className="mx-auto flex min-h-[68vh] max-w-[1440px] flex-col justify-end px-4 pb-8 md:min-h-[560px] md:px-10 md:pb-14">
        <div className="max-w-xl">
          <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.18em] text-primary-text">À la une</p>
          <h1 className="font-display text-[40px] font-extrabold uppercase leading-[0.95] tracking-[0.01em] md:text-[64px]">
            {series.title}
          </h1>
          <p className="mt-3 max-w-md text-[15px] text-text/90 md:text-lg">{series.tagline}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-muted">
            <span>{series.episodes} épisodes · {formatMinutes(series.totalSeconds)}</span>
            <span aria-hidden>·</span>
            <span>{series.genres.join(", ")}</span>
            <Badge kind="ai">Créée avec l&apos;IA</Badge>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" icon={<PlayIcon width={18} height={18} />}>
              Regarder l&apos;épisode 1 — Gratuit
            </Button>
            <Button size="lg" variant="secondary">
              Plus d&apos;infos
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
