import { describe, expect, it } from "vitest";
import { autoAdvance, buildSlides, isCompleted, resumeIndex, type EpisodeInfo, type SeasonInfo } from "./sequencer";

const ep = (n: number, access: "free" | "paid", status: "published" | "scheduled" = "published"): EpisodeInfo => ({
  id: `e${n}`, number: n, title: `Épisode ${n}`, durationSeconds: 600, access, status,
});
const season: SeasonInfo = {
  id: "s1", seriesTitle: "Sang Royal", number: 1,
  episodes: [ep(3, "paid"), ep(1, "free"), ep(2, "free"), ep(4, "paid"), ep(5, "paid", "scheduled")],
};
const none = { seasonPassIds: new Set<string>(), episodeIds: new Set<string>() };
const next = { id: "s2", number: 2, firstEpisodeFree: true };

describe("séquenceur — construction des diapositives", () => {
  it("ordonne les épisodes et ajoute la fin de saison", () => {
    const slides = buildSlides(season, none, next);
    expect(slides.map((s) => (s.kind === "season-end" ? "fin" : s.episode.number))).toEqual([1, 2, 3, 4, 5, "fin"]);
  });

  it("sans achat : gratuits lisibles, payants verrouillés, programmé « bientôt »", () => {
    const slides = buildSlides(season, none, next);
    expect(slides.map((s) => (s.kind === "episode" ? s.state : s.kind))).toEqual([
      "playable", "playable", "locked", "locked", "scheduled", "season-end",
    ]);
  });

  it("épisode acheté à l'unité : seul cet épisode est débloqué (FR-40)", () => {
    const slides = buildSlides(season, { seasonPassIds: new Set(), episodeIds: new Set(["e3"]) }, next);
    expect(slides.filter((s) => s.kind === "episode" && s.state === "playable").map((s) => s.kind === "episode" && s.episode.number)).toEqual([1, 2, 3]);
  });

  it("pass saison : tous les épisodes publiés lisibles, le programmé indiqué comme inclus (FR-39, FR-41)", () => {
    const slides = buildSlides(season, { seasonPassIds: new Set(["s1"]), episodeIds: new Set() }, next);
    expect(slides.filter((s) => s.kind === "episode").every((s) => s.kind === "episode" && s.state === "playable")).toBe(true);
    expect(slides.find((s) => s.kind === "scheduled")).toMatchObject({ coveredByPass: true });
  });

  it("un épisode programmé n'est jamais lisible, même avec le pass", () => {
    const slides = buildSlides(season, { seasonPassIds: new Set(["s1"]), episodeIds: new Set(["e5"]) }, next);
    expect(slides.some((s) => s.kind === "episode" && s.episode.id === "e5")).toBe(false);
  });

  it("le pass de la saison 1 ne débloque jamais la saison 2 (RM-13)", () => {
    const slides = buildSlides(season, { seasonPassIds: new Set(["s1"]), episodeIds: new Set() }, next);
    expect(slides.at(-1)).toMatchObject({ kind: "season-end", next: { unlocked: false } });
  });

  it("la saison 2 n'est débloquée que par son propre pass", () => {
    const slides = buildSlides(season, { seasonPassIds: new Set(["s2"]), episodeIds: new Set() }, next);
    expect(slides.at(-1)).toMatchObject({ next: { unlocked: true } });
  });

  it("dernière saison : pas de saison suivante proposée", () => {
    expect(buildSlides(season, none, null).at(-1)).toMatchObject({ kind: "season-end", next: null });
  });
});

describe("séquenceur — enchaînement automatique (RM-14)", () => {
  it("passe à l'épisode suivant lisible avec lecture automatique", () => {
    const slides = buildSlides(season, none, next);
    expect(autoAdvance(slides, 0)).toEqual({ index: 1, autoplay: true });
  });
  it("s'arrête devant un épisode verrouillé, sans lecture automatique", () => {
    const slides = buildSlides(season, none, next);
    expect(autoAdvance(slides, 1)).toEqual({ index: 2, autoplay: false });
  });
  it("avec le pass, enchaîne jusqu'à l'épisode programmé sans demander de paiement", () => {
    const slides = buildSlides(season, { seasonPassIds: new Set(["s1"]), episodeIds: new Set() }, next);
    expect(autoAdvance(slides, 2)).toEqual({ index: 3, autoplay: true });
    expect(autoAdvance(slides, 3)).toEqual({ index: 4, autoplay: false });
  });
  it("rien après la fin de saison", () => {
    const slides = buildSlides(season, none, next);
    expect(autoAdvance(slides, slides.length - 1)).toBeNull();
  });
});

describe("séquenceur — reprise (FR-37)", () => {
  const slides = buildSlides(season, none, next);
  it("reprend l'épisode regardé le plus récemment, s'il n'est pas terminé", () => {
    const p = new Map([
      ["e1", { positionSeconds: 1, completed: false, updatedAt: 100 }],
      ["e2", { positionSeconds: 120, completed: false, updatedAt: 300 }],
    ]);
    expect(resumeIndex(slides, p)).toBe(1);
  });
  it("un épisode commencé il y a longtemps ne prend pas le pas sur le plus récent", () => {
    const p = new Map([
      ["e1", { positionSeconds: 1, completed: false, updatedAt: 100 }],
      ["e3", { positionSeconds: 40, completed: false, updatedAt: 500 }],
    ]);
    expect(resumeIndex(slides, p)).toBe(2);
  });
  it("si le plus récent est terminé, propose la diapositive suivante", () => {
    const p = new Map([["e1", { positionSeconds: 600, completed: true, updatedAt: 100 }]]);
    expect(resumeIndex(slides, p)).toBe(1);
  });
  it("sinon le premier épisode", () => {
    expect(resumeIndex(slides, new Map())).toBe(0);
  });
  it("« vu » au-delà de 95 %", () => {
    expect(isCompleted(570, 600)).toBe(true);
    expect(isCompleted(500, 600)).toBe(false);
    expect(isCompleted(10, 0)).toBe(false);
  });
});
