import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, isSameOrigin } from "@/server/http/same-origin";
import { getPool } from "@/server/db/pool";
import { getVideoProvider } from "@/server/providers/video";
import { SlidingWindowLimiter } from "@/server/playback/rate-limit";
import { authorizePlayback } from "@/server/playback/service";

export const dynamic = "force-dynamic";

const params = z.object({ episodeId: z.uuid() });
const body = z.object({ purpose: z.enum(["start", "renew", "preload"]).default("start") });

// SEC-54 : nouvelles lectures et renouvellements/préchargements limités séparément
// (valeurs lues dans le réglage `playback_token` ; celles-ci ne servent que si le réglage manque).
const limiters = { start: new SlidingWindowLimiter(600), refresh: new SlidingWindowLimiter(3000) };

const MESSAGES = {
  not_found: "Épisode introuvable.",
  locked: "Cet épisode n'est pas débloqué.",
  not_ready: "Cette vidéo est en cours de préparation.",
  rate_limited: "Trop de lectures en peu de temps. Réessayez dans quelques minutes.",
} as const;
const STATUS = { not_found: 404, locked: 403, not_ready: 409, rate_limited: 429 } as const;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/** Émet un lien de lecture court APRÈS vérification du droit (SEC-51). */
export async function POST(request: Request, context: { params: Promise<{ episodeId: string }> }) {
  if (!isSameOrigin(request.headers)) return json({ error: "forbidden", message: "Requête refusée." }, 403);
  const p = params.safeParse(await context.params);
  if (!p.success) return json({ error: "not_found", message: MESSAGES.not_found }, 404);
  const b = body.safeParse(await request.json().catch(() => ({})));
  if (!b.success) return json({ error: "bad_request", message: "Requête invalide." }, 400);

  try {
    const decision = await authorizePlayback(getPool(), getVideoProvider(), limiters, {
      episodeId: p.data.episodeId,
      purpose: b.data.purpose,
      clientKey: clientKey(request.headers),
      customerId: null, // comptes clients : étape L3
    });
    if (decision.ok) return json({ url: decision.url, expiresAt: decision.expiresAt });
    return json({ error: decision.reason, message: MESSAGES[decision.reason] }, STATUS[decision.reason]);
  } catch (error) {
    console.error("playback", (error as Error).name);
    return json({ error: "unavailable", message: "Lecture momentanément indisponible." }, 503);
  }
}
