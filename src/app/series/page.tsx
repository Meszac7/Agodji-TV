import type { Metadata } from "next";
import { CatalogPage } from "@/components/player/CatalogPage";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { getCatalog } from "@/server/catalog/series-feed";
import { getPool } from "@/server/db/pool";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Séries" };

export default async function SeriesCatalogPage({ searchParams }: { searchParams: Promise<{ bientot?: string }> }) {
  const { bientot } = await searchParams;
  try {
    const items = await getCatalog(getPool());
    return <CatalogPage items={items} comingSoon={typeof bientot === "string" ? bientot : null} />;
  } catch (error) {
    console.error("catalog", (error as Error).name);
    return <ServiceUnavailable />;
  }
}
