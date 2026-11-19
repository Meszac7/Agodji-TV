import { hmacSha256Hex, safeEqualHex } from "../crypto";
import type { PlaybackGrant, VideoProvider } from "./types";

/**
 * Simulateur vidéo : URL de lecture locale signée avec expiration, comme le fera Bunny.
 * Permet de tester l'expiration et la falsification des liens. INTERDIT en production (SEC-44).
 */
export class VideoSimulator implements VideoProvider {
  readonly code = "simulator";

  constructor(
    private readonly secret: string,
    private readonly baseUrl = "/demo-video",
  ) {
    if (secret.length < 16) throw new Error("Secret du simulateur vidéo trop court");
  }

  async createPlaybackUrl(videoId: string, { validitySeconds, now = new Date() }: { validitySeconds: number; now?: Date }): Promise<PlaybackGrant> {
    if (validitySeconds <= 0 || validitySeconds > 3600) throw new RangeError("Durée de validité invalide");
    const expires = Math.floor(now.getTime() / 1000) + validitySeconds;
    const token = hmacSha256Hex(this.secret, `${videoId}:${expires}`);
    return { url: `${this.baseUrl}/${encodeURIComponent(videoId)}/playlist.m3u8?token=${token}&expires=${expires}`, expiresAt: new Date(expires * 1000) };
  }

  /** Vérification côté « CDN » simulé. */
  verify(videoId: string, token: string, expires: number, now: Date = new Date()): boolean {
    if (!Number.isInteger(expires) || expires < Math.floor(now.getTime() / 1000)) return false;
    return safeEqualHex(token, hmacSha256Hex(this.secret, `${videoId}:${expires}`));
  }
}
