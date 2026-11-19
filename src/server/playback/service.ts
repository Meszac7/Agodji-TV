import type { VideoProvider } from "@/server/providers/video/types";
import type { SlidingWindowLimiter } from "./rate-limit";

type Db = { query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> };

export type PlaybackPurpose = "start" | "renew" | "preload";
export type PlaybackDecision =
  | { ok: true; url: string; expiresAt: string }
  | { ok: false; reason: "not_found" | "locked" | "not_ready" | "rate_limited" };

/**
 * Couche « droits d'accès » (TECHNICAL_ARCHITECTURE §6.4) : le lien de lecture n'est émis
 * qu'après has_episode_access, calculé par la base. Aucune règle d'accès n'est réécrite ici.
 */
export async function authorizePlayback(
  db: Db,
  provider: VideoProvider,
  limiters: { start: SlidingWindowLimiter; refresh: SlidingWindowLimiter },
  request: { episodeId: string; purpose: PlaybackPurpose; clientKey: string; customerId: string | null; now?: Date },
): Promise<PlaybackDecision> {
  const { rows } = await db.query(
    `SELECT e.video_id, e.video_status, app.is_episode_public(e.id) AS is_public,
            app.has_episode_access($2, e.id) AS allowed,
            (SELECT value FROM app.app_settings WHERE key = 'playback_token') AS settings
       FROM app.episodes e WHERE e.id = $1`,
    [request.episodeId, request.customerId],
  );
  const ep = rows[0];
  // Brouillon, épisode non sorti, série non publiée : réponse identique à « inexistant ».
  if (!ep || !ep.is_public) return { ok: false, reason: "not_found" };
  if (!ep.allowed) return { ok: false, reason: "locked" };
  if (ep.video_status !== "ready" || !ep.video_id) return { ok: false, reason: "not_ready" };

  const settings = (ep.settings ?? {}) as { validity_seconds?: number; per_ip_hour?: number; refresh_per_ip_hour?: number };
  const isStart = request.purpose === "start";
  const limiter = isStart ? limiters.start : limiters.refresh;
  const limit = isStart ? settings.per_ip_hour : settings.refresh_per_ip_hour;
  if (!limiter.take(request.clientKey, request.now?.getTime(), limit)) return { ok: false, reason: "rate_limited" };

  const validity = Number(settings.validity_seconds ?? 300);
  const grant = await provider.createPlaybackUrl(String(ep.video_id), { validitySeconds: validity, now: request.now });
  return { ok: true, url: grant.url, expiresAt: grant.expiresAt.toISOString() };
}
