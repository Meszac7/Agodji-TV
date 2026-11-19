import { describe, expect, it } from "vitest";
import { parseTheme } from "./theme";

describe("parseTheme", () => {
  it("sombre par défaut, clair si choisi, valeur inconnue ignorée", () => {
    expect(parseTheme(undefined)).toBe("dark");
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("<script>")).toBe("dark");
  });
});
