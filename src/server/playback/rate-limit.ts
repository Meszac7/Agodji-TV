/**
 * Limite d'émission de liens de lecture (SEC-54) : fenêtre glissante d'une heure, par client.
 * Les nouvelles lectures et les renouvellements/préchargements ont des limites séparées.
 * Étape L1 : compteur en mémoire du serveur (suffisant pour la préproduction). L'étape L4 le rattache
 * au compte client et le rend commun à tous les serveurs.
 */
export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>();
  constructor(private readonly defaultLimit: number, private readonly windowMs = 3_600_000) {}

  /** Vrai si la demande est acceptée (et comptée). La limite peut venir des réglages en base. */
  take(key: string, now = Date.now(), limit = this.defaultLimit): boolean {
    const list = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (list.length >= limit) {
      this.hits.set(key, list);
      return false;
    }
    list.push(now);
    this.hits.set(key, list);
    if (this.hits.size > 50_000) this.hits.clear(); // garde-fou mémoire
    return true;
  }
}
