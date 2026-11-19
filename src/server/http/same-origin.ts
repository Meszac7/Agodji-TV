/**
 * Protection CSRF des routes API (SEC-84) : une requête qui modifie un état ou émet un jeton
 * doit venir de notre propre site (en-tête Origin identique à l'hôte).
 */
export function isSameOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Adresse du client pour les limites de fréquence (jamais journalisée en clair). */
export function clientKey(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "inconnu";
}
