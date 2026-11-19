"use client";

import { useRouter } from "next/navigation";
import type { OtherSeries } from "@/lib/player/sequencer";
import { CatalogView } from "./feed/SeriesViews";

/** Catalogue réel (écran validé de la maquette V2), alimenté par la base. */
export function CatalogPage({ items, comingSoon }: { items: OtherSeries[]; comingSoon: string | null }) {
  const router = useRouter();
  const announced = items.find((s) => s.slug === comingSoon && !s.available);
  return (
    <CatalogView
      items={items}
      notice={announced ? `« ${announced.title} » arrive bientôt sur Agodjié TV.` : null}
      badge="Catalogue"
      testId="catalog"
      onOpen={(s) => router.push(s.available ? `/series/${s.slug}` : `/series?bientot=${encodeURIComponent(s.slug)}`)}
    />
  );
}
