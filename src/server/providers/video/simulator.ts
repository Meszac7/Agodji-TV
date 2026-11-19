import { hmacSha256Hex, safeEqualHex } from "../crypto";
import type { PlaybackGrant, VideoProvider } from "./types";

/**
 * Simulateur vidéo : imite l'authentification par jeton CDN de Bunny Stream (jeton DANS LE CHEMIN,
 * valable pour la playlist et tous ses segments, avec expiration). Sert les flux HLS de démonstration.
 * INTERDIT en production (SEC-44) : refusé par parseServerEnv, par createVideoProvider et par la route.
 * URL : {base}/{jeton}/{expiration}/{videoId}/playlist.m3u8
 */
export class VideoSimulator implements VideoProvider {
  readonly code = "simulator";

  constructor(
    private readonly secret: string,
    private readonly baseUrl = "/sim-video",
  ) {
    if (secret.length < 16) throw new Error("Secret du simulateur vidéo trop court");
  }

  async createPlaybackUrl(videoId: string, { validitySeconds, now = new Date() }: { validitySeconds: number; now?: Date }): Promise<PlaybackGrant> {
    if (validitySeconds <= 0 || validitySeconds > 3600) throw new RangeError("Durée de validité invalide");
    const expires = Math.floor(now.getTime() / 1000) + validitySeconds;
    const token = hmacSha256Hex(this.secret, `${videoId}:${expires}`);
    return { url: `${this.baseUrl}/${token}/${expires}/${encodeURIComponent(videoId)}/playlist.m3u8`, expiresAt: new Date(expires * 1000) };
  }

  /** Vérification côté « CDN » simulé (à chaque fichier : playlist et segments). */
  verify(videoId: string, token: string, expires: number, now: Date = new Date()): boolean {
    if (!Number.isInteger(expires) || expires < Math.floor(now.getTime() / 1000)) return false;
    return safeEqualHex(token, hmacSha256Hex(this.secret, `${videoId}:${expires}`));
  }
}
