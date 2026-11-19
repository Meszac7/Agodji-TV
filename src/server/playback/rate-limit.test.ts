import { describe, expect, it } from "vitest";
import { isSameOrigin } from "@/server/http/same-origin";
import { SlidingWindowLimiter } from "./rate-limit";

describe("limite d'émission de liens (SEC-54)", () => {
  it("bloque au-delà de la limite puis libère après une heure", () => {
    const l = new SlidingWindowLimiter(2);
    expect(l.take("a", 0)).toBe(true);
    expect(l.take("a", 1000)).toBe(true);
    expect(l.take("a", 2000)).toBe(false);
    expect(l.take("b", 2000)).toBe(true);
    expect(l.take("a", 3_600_001)).toBe(true);
  });
});

describe("protection CSRF des routes API (SEC-84)", () => {
  const h = (o: Record<string, string>) => new Headers(o);
  it("accepte une requête de notre propre site", () => {
    expect(isSameOrigin(h({ origin: "https://agodjie.tv", host: "agodjie.tv" }))).toBe(true);
  });
  it("refuse une autre origine ou une origine absente", () => {
    expect(isSameOrigin(h({ origin: "https://pirate.example", host: "agodjie.tv" }))).toBe(false);
    expect(isSameOrigin(h({ host: "agodjie.tv" }))).toBe(false);
  });
});
