import { NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/server/db/pool";
import { getSeriesFeed } from "@/server/catalog/series-feed";

export const dynamic = "force-dynamic";

const params = z.object({ slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(120) });

/** Diapositives d'une série et leur état pour le visiteur (sans identifiant vidéo). */
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const p = params.safeParse(await context.params);
  const headers = { "Cache-Control": "no-store" };
  if (!p.success) return NextResponse.json({ error: "not_found" }, { status: 404, headers });
  try {
    const feed = await getSeriesFeed(getPool(), p.data.slug);
    if (!feed) return NextResponse.json({ error: "not_found" }, { status: 404, headers });
    return NextResponse.json(feed, { headers });
  } catch (error) {
    console.error("feed", (error as Error).name);
    return NextResponse.json({ error: "unavailable" }, { status: 503, headers });
  }
}
