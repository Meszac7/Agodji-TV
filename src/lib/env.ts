import { z } from "zod";

/**
 * Lecture et validation des variables d'environnement côté serveur.
 * Règle SEC-44 : aucun simulateur n'est autorisé lorsque APP_ENV=production.
 */
const envSchema = z.object({
  APP_ENV: z.enum(["development", "test", "preview", "production"]).default("development"),
  PAYMENT_SIMULATOR_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  VIDEO_PROVIDER: z.string().min(1).default("simulator"),
});

export type ServerEnv = z.infer<typeof envSchema>;

export class UnsafeConfigurationError extends Error {
  override name = "UnsafeConfigurationError";
}

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const env = envSchema.parse(source);
  assertNoSimulatorInProduction(env);
  return env;
}

export function assertNoSimulatorInProduction(env: ServerEnv): void {
  if (env.APP_ENV !== "production") return;
  const problems: string[] = [];
  if (env.PAYMENT_SIMULATOR_ENABLED) problems.push("PAYMENT_SIMULATOR_ENABLED=true");
  if (env.VIDEO_PROVIDER === "simulator") problems.push("VIDEO_PROVIDER=simulator");
  if (problems.length > 0) {
    throw new UnsafeConfigurationError(
      `Simulateur interdit en production (SEC-44) : ${problems.join(", ")}`,
    );
  }
}

export function isProduction(source: Record<string, string | undefined> = process.env): boolean {
  return source.APP_ENV === "production";
}
