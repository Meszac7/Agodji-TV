import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeriesExperience } from "@/components/player/SeriesExperience";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { getSeriesFeed, type SeriesFeed } from "@/server/catalog/series-feed";
import { getPool } from "@/server/db/pool";

export const dynamic = "force-dynamic";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

async function load(slug: string): Promise<SeriesFeed | null | "error"> {
  if (!SLUG.test(slug) || slug.length > 120) return null;
  try {
    return await getSeriesFeed(getPool(), slug);
  } catch (error) {
    console.error("series", (error as Error).name);
    return "error";
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const feed = await load((await params).slug);
  return { title: feed && feed !== "error" ? feed.title : "Série" };
}

export default async function SeriesPage({ params }: { params: Promise<{ slug: string }> }) {
  const feed = await load((await params).slug);
  if (feed === "error") return <ServiceUnavailable />;
  if (!feed) notFound();
  return <SeriesExperience feed={feed} />;
}
