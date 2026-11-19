import { describe, expect, it } from "vitest";
import { passOffer, type SeriesPrices } from "./pricing";
import type { EpisodeInfo, SeriesInfo } from "./sequencer";

const ep = (n: number, access: "free" | "paid", status: "published" | "scheduled" = "published"): EpisodeInfo => ({
  id: `e${n}`, number: n, title: `Épisode ${n}`, durationSeconds: 90, access, status,
});
const series: SeriesInfo = {
  id: "s1",
  title: "Série",
  episodes: [ep(1, "free"), ep(2, "free"), ep(3, "paid"), ep(4, "paid"), ep(5, "paid"), ep(6, "paid"), ep(7, "paid", "scheduled")],
};
const prices: SeriesPrices = { pass: 1500, episodes: { e3: 499, e4: 499, e5: 499, e6: 499, e7: 499 } };
const none = { seriesPassIds: new Set<string>(), episodeIds: new Set<string>() };

describe("offre Pass série et économie", () => {
  it("économie = épisodes payants publiés non possédés − prix du Pass", () => {
    expect(passOffer(series, none, prices)).toEqual({
      remainingCount: 4, remainingTotal: 1996, saving: 496, upcomingCount: 1, minEpisodePrice: 499, uniformEpisodePrice: true,
    });
  });

  it("les épisodes déjà achetés à l'unité réduisent l'économie affichée", () => {
    const o = passOffer(series, { ...none, episodeIds: new Set(["e3"]) }, prices);
    expect(o).toMatchObject({ remainingCount: 3, remainingTotal: 1497, saving: 0 });
  });

  it("jamais d'économie négative", () => {
    const o = passOffer(series, none, { ...prices, pass: 5000 });
    expect(o.saving).toBe(0);
  });

  it("chaque épisode peut avoir son propre prix ; le Pass a le prix propre à sa série", () => {
    const o = passOffer(series, none, { pass: 990, episodes: { e3: 499, e4: 499, e5: 299, e6: 699, e7: 499 } });
    expect(o).toMatchObject({ remainingTotal: 1996, saving: 1006, minEpisodePrice: 299, uniformEpisodePrice: false });
  });

  it("avec le Pass, plus rien à acheter", () => {
    const o = passOffer(series, { ...none, seriesPassIds: new Set(["s1"]) }, prices);
    expect(o).toMatchObject({ remainingCount: 0, remainingTotal: 0, saving: 0 });
  });

  it("les épisodes programmés ne comptent pas dans l'économie mais sont annoncés comme inclus", () => {
    expect(passOffer(series, none, prices).upcomingCount).toBe(1);
  });
});
