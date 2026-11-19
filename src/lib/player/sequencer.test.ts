import { describe, expect, it } from "vitest";
import {
  autoAdvance,
  buildSlides,
  formatMinutes,
  isCompleted,
  paymentPromptCount,
  resumeIndex,
  totalDurationSeconds,
  type EpisodeInfo,
  type SeriesInfo,
} from "./sequencer";

const ep = (n: number, access: "free" | "paid", status: "published" | "scheduled" = "published"): EpisodeInfo => ({
  id: `e${n}`, number: n, title: `Épisode ${n}`, durationSeconds: 90, access, status,
  publishAt: status === "scheduled" ? "2026-11-28T18:00:00Z" : undefined,
});
const series: SeriesInfo = {
  id: "sr", title: "Sang Royal",
  episodes: [ep(3, "paid"), ep(1, "free"), ep(2, "free"), ep(4, "paid"), ep(5, "paid", "scheduled")],
};
const others = [
  { id: "sr", slug: "sang-royal", title: "Sang Royal", poster: "", available: true },
  { id: "nc", slug: "nuits-de-cotonou", title: "Nuits de Cotonou", poster: "", available: false },
];
const none = { seriesPassIds: new Set<string>(), episodeIds: new Set<string>() };
const pass = { seriesPassIds: new Set(["sr"]), episodeIds: new Set<string>() };

describe("séquenceur — construction des diapositives (séries sans saisons)", () => {
  it("ordonne les épisodes 1 → N et termine par la fin de série", () => {
    const slides = buildSlides(series, none, others);
    expect(slides.map((s) => (s.kind === "series-end" ? "fin" : s.episode.number))).toEqual([1, 2, 3, 4, 5, "fin"]);
  });

  it("sans achat : gratuits lisibles, payants verrouillés, programmé « bientôt »", () => {
    const slides = buildSlides(series, none, others);
    expect(slides.map((s) => (s.kind === "episode" ? s.state : s.kind))).toEqual([
      "playable", "playable", "locked", "locked", "scheduled", "series-end",
    ]);
  });

  it("épisode acheté à l'unité : seul cet épisode est débloqué (FR-40)", () => {
    const slides = buildSlides(series, { seriesPassIds: new Set(), episodeIds: new Set(["e3"]) }, others);
    expect(slides.filter((s) => s.kind === "episode" && s.state === "playable").map((s) => s.kind === "episode" && s.episode.number)).toEqual([1, 2, 3]);
    expect(paymentPromptCount(slides)).toBe(1);
  });

  it("pass série : tous les épisodes publiés lisibles, plus aucune demande de paiement (RM-16)", () => {
    const slides = buildSlides(series, pass, others);
    expect(paymentPromptCount(slides)).toBe(0);
    expect(slides.find((s) => s.kind === "scheduled")).toMatchObject({ coveredByPass: true });
  });

  it("le pass d'une autre série ne débloque rien ici", () => {
    const slides = buildSlides(series, { seriesPassIds: new Set(["nc"]), episodeIds: new Set() }, others);
    expect(paymentPromptCount(slides)).toBe(2);
  });

  it("un épisode programmé n'est jamais lisible, même avec le pass", () => {
    const slides = buildSlides(series, { seriesPassIds: new Set(["sr"]), episodeIds: new Set(["e5"]) }, others);
    expect(slides.some((s) => s.kind === "episode" && s.episode.id === "e5")).toBe(false);
  });

  it("fin de série : autres séries (sans la série courante) et date du prochain épisode, jamais de saison", () => {
    const end = buildSlides(series, none, others).at(-1);
    expect(end).toEqual({
      kind: "series-end",
      nextScheduledAt: "2026-11-28T18:00:00Z",
      otherSeries: [others[1]],
    });
  });

  it("fin de série sans épisode annoncé", () => {
    const done: SeriesInfo = { ...series, episodes: series.episodes.filter((e) => e.status === "published") };
    expect(buildSlides(done, none, others).at(-1)).toMatchObject({ nextScheduledAt: null });
  });
});

describe("séquenceur — enchaînement automatique (RM-14)", () => {
  it("passe à l'épisode suivant lisible avec lecture automatique", () => {
    expect(autoAdvance(buildSlides(series, none, others), 0)).toEqual({ index: 1, autoplay: true });
  });
  it("s'arrête devant un épisode verrouillé, sans lecture automatique", () => {
    expect(autoAdvance(buildSlides(series, none, others), 1)).toEqual({ index: 2, autoplay: false });
  });
  it("avec le pass série, enchaîne sans demander de paiement jusqu'à l'épisode programmé", () => {
    const slides = buildSlides(series, pass, others);
    expect(autoAdvance(slides, 2)).toEqual({ index: 3, autoplay: true });
    expect(autoAdvance(slides, 3)).toEqual({ index: 4, autoplay: false });
  });
  it("rien après la fin de série", () => {
    const slides = buildSlides(series, none, others);
    expect(autoAdvance(slides, slides.length - 1)).toBeNull();
  });
});

describe("séquenceur — reprise (FR-37)", () => {
  const slides = buildSlides(series, none, others);
  it("reprend l'épisode regardé le plus récemment, s'il n'est pas terminé", () => {
    const p = new Map([
      ["e1", { positionSeconds: 1, completed: false, updatedAt: 100 }],
      ["e2", { positionSeconds: 40, completed: false, updatedAt: 300 }],
    ]);
    expect(resumeIndex(slides, p)).toBe(1);
  });
  it("si le plus récent est terminé, propose la diapositive suivante", () => {
    expect(resumeIndex(slides, new Map([["e1", { positionSeconds: 90, completed: true, updatedAt: 1 }]]))).toBe(1);
  });
  it("sinon le premier épisode", () => {
    expect(resumeIndex(slides, new Map())).toBe(0);
  });
  it("« vu » au-delà de 95 %", () => {
    expect(isCompleted(86, 90)).toBe(true);
    expect(isCompleted(80, 90)).toBe(false);
    expect(isCompleted(10, 0)).toBe(false);
  });
});

describe("durée totale", () => {
  it("additionne les durées et s'affiche en minutes", () => {
    expect(totalDurationSeconds(series)).toBe(450);
    expect(formatMinutes(450)).toBe("7 min 30");
    expect(formatMinutes(900)).toBe("15 min");
    expect(formatMinutes(649)).toBe("10 min 49");
  });
});
