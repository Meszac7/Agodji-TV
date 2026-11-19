import { describe, expect, it } from "vitest";
import { parseQualityMode, pickLevel, shouldSuggestAuto, variantUrlFor } from "./quality";

const levels = [
  { width: 360, height: 640, codecs: "avc1.4d401f" },
  { width: 480, height: 854, codecs: "vp09.00.30.08" },
  { width: 480, height: 854, codecs: "avc1.4d401f" },
  { width: 720, height: 1280, codecs: "avc1.4d401f" },
];

describe("choix de la qualité vidéo", () => {
  it("automatique par défaut, valeur inconnue → automatique", () => {
    expect(parseQualityMode(null)).toBe("auto");
    expect(parseQualityMode("1080")).toBe("auto");
    expect(parseQualityMode("480")).toBe("480");
  });

  it("automatique = laisser le lecteur choisir (-1)", () => {
    expect(pickLevel(levels, "auto")).toBe(-1);
  });

  it("qualité exacte, H.264 préféré quand deux variantes existent", () => {
    expect(pickLevel(levels, "360")).toBe(0);
    expect(pickLevel(levels, "480")).toBe(2);
    expect(pickLevel(levels, "720")).toBe(3);
  });

  it("vertical ou horizontal : on compare le côté court", () => {
    expect(pickLevel([{ width: 1280, height: 720 }, { width: 640, height: 360 }], "360")).toBe(1);
  });

  it("qualité absente : la plus proche en dessous, sinon la plus basse", () => {
    expect(pickLevel([{ width: 360, height: 640 }, { width: 720, height: 1280 }], "480")).toBe(0);
    expect(pickLevel([{ width: 480, height: 854 }, { width: 720, height: 1280 }], "360")).toBe(0);
  });

  it("lecture native : variante choisie dans la playlist principale, dans le même dossier signé", () => {
    const master = [
      "#EXTM3U",
      '#EXT-X-STREAM-INF:BANDWIDTH=440000,RESOLUTION=360x640,CODECS="avc1.4d401f"',
      "h264-360p.m3u8",
      '#EXT-X-STREAM-INF:BANDWIDTH=1320000,RESOLUTION=720x1280,CODECS="avc1.4d401f"',
      "h264-720p.m3u8",
    ].join("\n");
    const url = "/sim-video/abc/123/demo-1/playlist.m3u8";
    expect(variantUrlFor(master, url, "360")).toBe("/sim-video/abc/123/demo-1/h264-360p.m3u8");
    expect(variantUrlFor(master, "https://cdn.exemple/t=1/v/playlist.m3u8", "720")).toBe("https://cdn.exemple/t=1/v/h264-720p.m3u8");
    expect(variantUrlFor(master, url, "auto")).toBe(url);
  });

  it("connexion insuffisante : proposition seulement en mode manuel, après 2 coupures en 30 s ou 1 longue", () => {
    const now = 100_000;
    expect(shouldSuggestAuto("auto", [{ at: now, durationMs: 9000 }], now)).toBe(false);
    expect(shouldSuggestAuto("720", [{ at: now - 1000, durationMs: 800 }], now)).toBe(false);
    expect(shouldSuggestAuto("720", [{ at: now - 20_000, durationMs: 800 }, { at: now - 1000, durationMs: 800 }], now)).toBe(true);
    expect(shouldSuggestAuto("720", [{ at: now - 60_000, durationMs: 800 }, { at: now - 1000, durationMs: 800 }], now)).toBe(false);
    expect(shouldSuggestAuto("480", [{ at: now - 500, durationMs: 4500 }], now)).toBe(true);
  });
});
