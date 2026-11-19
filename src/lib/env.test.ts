import { describe, expect, it } from "vitest";
import { UnsafeConfigurationError, parseServerEnv } from "./env";

describe("garde de configuration (SEC-44)", () => {
  it("accepte les simulateurs en développement", () => {
    const env = parseServerEnv({ APP_ENV: "development", PAYMENT_SIMULATOR_ENABLED: "true" });
    expect(env.PAYMENT_SIMULATOR_ENABLED).toBe(true);
  });

  it("refuse de démarrer en production avec le simulateur de paiement", () => {
    expect(() =>
      parseServerEnv({ APP_ENV: "production", PAYMENT_SIMULATOR_ENABLED: "true", VIDEO_PROVIDER: "bunny" }),
    ).toThrow(UnsafeConfigurationError);
  });

  it("refuse de démarrer en production avec le simulateur vidéo (valeur par défaut comprise)", () => {
    expect(() => parseServerEnv({ APP_ENV: "production" })).toThrow(/VIDEO_PROVIDER=simulator/);
  });

  it("accepte la production sans aucun simulateur", () => {
    const env = parseServerEnv({ APP_ENV: "production", PAYMENT_SIMULATOR_ENABLED: "false", VIDEO_PROVIDER: "bunny" });
    expect(env.APP_ENV).toBe("production");
  });

  it("rejette un environnement inconnu", () => {
    expect(() => parseServerEnv({ APP_ENV: "prod" })).toThrow();
  });
});
