/**
 * Outils purs du moteur de diffusion (testés unitairement).
 * Les liens de lecture portent le jeton DANS LE CHEMIN (comme l'authentification par jeton de Bunny) :
 * tous les fichiers d'un flux (playlist, qualités, segments) partagent le même « dossier signé ».
 * Pour renouveler un jeton sans interrompre la lecture, chaque requête est réécrite vers le dossier
 * signé le plus récent.
 */
export function signedDir(url: string): string {
  const clean = url.split(/[?#]/)[0]!;
  return clean.slice(0, clean.lastIndexOf("/") + 1);
}

/** Réécrit une URL issue d'un ancien dossier signé vers le dossier signé courant. */
export function rewriteToCurrentGrant(requestUrl: string, knownDirs: readonly string[], currentDir: string): string {
  for (const dir of knownDirs) {
    const abs = toAbsolute(dir, requestUrl);
    if (requestUrl.startsWith(abs) && dir !== currentDir) return toAbsolute(currentDir, requestUrl) + requestUrl.slice(abs.length);
  }
  return requestUrl;
}

function toAbsolute(dir: string, reference: string): string {
  try {
    return new URL(dir, reference).toString();
  } catch {
    return dir;
  }
}

/** Faut-il renouveler le lien ? (marge de sécurité avant expiration) */
export function needsRenewal(expiresAt: string, now = Date.now(), marginMs = 30_000): boolean {
  return new Date(expiresAt).getTime() - now <= marginMs;
}

/** Délai avant la n-ième nouvelle tentative réseau (1 s, 2 s, 4 s, 8 s, plafonné à 15 s). */
export function retryDelayMs(attempt: number): number {
  return Math.min(15_000, 1000 * 2 ** Math.max(0, attempt - 1));
}

export type PlaybackGrant = { url: string; expiresAt: string };

export type PlaybackErrorKind = "offline" | "network" | "locked" | "not_found" | "not_ready" | "rate_limited" | "media" | "unavailable";

/** Messages clairs pour chaque erreur (FR-43). */
export const PLAYBACK_ERROR_MESSAGES: Record<PlaybackErrorKind, string> = {
  offline: "Vous êtes hors connexion. La lecture reprendra dès le retour du réseau.",
  network: "La connexion est trop faible pour lire cet épisode.",
  locked: "Cet épisode n'est pas débloqué.",
  not_found: "Cet épisode n'est plus disponible.",
  not_ready: "Cette vidéo est en cours de préparation. Réessayez dans quelques minutes.",
  rate_limited: "Trop de lectures en peu de temps. Réessayez dans quelques minutes.",
  media: "Cette vidéo ne peut pas être lue sur cet appareil.",
  unavailable: "La lecture est momentanément indisponible.",
};
