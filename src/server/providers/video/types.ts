export type PlaybackGrant = { url: string; expiresAt: Date };

/** Hébergeur vidéo (Bunny Stream à l'étape 6). Le lecteur ne dépend que de cette interface. */
export interface VideoProvider {
  readonly code: string;
  /** À n'appeler qu'APRÈS vérification du droit d'accès (SEC-51). */
  createPlaybackUrl(videoId: string, options: { validitySeconds: number; now?: Date }): Promise<PlaybackGrant>;
}
