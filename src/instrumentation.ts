import { parseServerEnv } from "@/lib/env";

/**
 * Exécuté au démarrage du serveur Next.js : refuse de démarrer avec une configuration
 * dangereuse (ex. simulateur en production, SEC-44).
 */
export function register() {
  parseServerEnv(process.env);
}
