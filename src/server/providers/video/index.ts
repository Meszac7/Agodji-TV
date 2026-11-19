import "server-only";
import { randomBytes } from "node:crypto";
import { parseServerEnv } from "@/lib/env";
import { SimulatorForbiddenError } from "../registry";
import { VideoSimulator } from "./simulator";
import type { VideoProvider } from "./types";

let simulator: VideoSimulator | undefined;

/**
 * Secret du simulateur : variable SIMULATOR_SIGNING_SECRET ; en développement local et en test seulement,
 * un secret aléatoire propre au processus est accepté (aucun secret écrit dans le dépôt).
 */
export function simulatorSecret(env: Record<string, string | undefined>): string {
  const configured = env.SIMULATOR_SIGNING_SECRET;
  if (configured) return configured;
  if (env.APP_ENV === "development" || env.APP_ENV === "test" || !env.APP_ENV) {
    return (globalThis as { __agodjieSimSecret?: string }).__agodjieSimSecret ??= randomBytes(32).toString("hex");
  }
  throw new Error("SIMULATOR_SIGNING_SECRET est obligatoire en préproduction");
}

/** Fournisseur vidéo configuré. Le simulateur est refusé en production (SEC-44). */
export function getVideoProvider(env: Record<string, string | undefined> = process.env): VideoProvider {
  return getVideoSimulator(env) ?? unavailable(parseServerEnv(env).VIDEO_PROVIDER);
}

/** Simulateur (ou undefined si un autre fournisseur est configuré). Lève une erreur en production. */
export function getVideoSimulator(env: Record<string, string | undefined> = process.env): VideoSimulator | undefined {
  const parsed = parseServerEnv(env); // refuse VIDEO_PROVIDER=simulator en production
  if (parsed.VIDEO_PROVIDER !== "simulator") return undefined;
  if (parsed.APP_ENV === "production") throw new SimulatorForbiddenError("Simulateur vidéo interdit en production (SEC-44)");
  return (simulator ??= new VideoSimulator(simulatorSecret(env)));
}

function unavailable(code: string): never {
  // L'adaptateur Bunny Stream arrive à l'étape L2.
  throw new Error(`Fournisseur vidéo non disponible : ${code}`);
}
