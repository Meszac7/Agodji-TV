/**
 * Choix de la qualité vidéo par le spectateur (FR-36, option A validée par le fondateur).
 * « Automatique » par défaut ; le choix est mémorisé sur l'appareil.
 * Fonctions pures, testées unitairement.
 */
export type QualityMode = "auto" | "360" | "480" | "720";

export const QUALITY_MODES: readonly QualityMode[] = ["auto", "360", "480", "720"];

export const QUALITY_OPTIONS: Record<QualityMode, { title: string; detail: string; short: string }> = {
  auto: { title: "Automatique", detail: "Recommandé · s'adapte à votre connexion", short: "Auto" },
  "360": { title: "Économie de données", detail: "360p · ≈ 10 Mo par épisode", short: "360p" },
  "480": { title: "Équilibré", detail: "480p · ≈ 17 Mo par épisode", short: "480p" },
  "720": { title: "Haute qualité", detail: "720p · ≈ 33 Mo par épisode", short: "720p" },
};

const STORAGE_KEY = "agodjie-qualite-video";

export function parseQualityMode(value: unknown): QualityMode {
  return QUALITY_MODES.includes(value as QualityMode) ? (value as QualityMode) : "auto";
}

export function loadQualityMode(): QualityMode {
  try {
    return parseQualityMode(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return "auto";
  }
}

export function saveQualityMode(mode: QualityMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* stockage indisponible : le choix vaut pour cette visite seulement */
  }
}

export type LevelInfo = { width: number; height: number; codecs?: string };

/** Côté court de l'image : 360, 480, 720 (valable en vertical comme en horizontal). */
function shortSide(l: LevelInfo): number {
  return Math.min(l.width || l.height, l.height || l.width);
}

/**
 * Indice de la qualité à imposer (-1 = automatique). Qualité exacte si elle existe
 * (H.264 préféré), sinon la plus proche en dessous, sinon la plus basse.
 */
export function pickLevel(levels: readonly LevelInfo[], mode: QualityMode): number {
  if (mode === "auto" || levels.length === 0) return -1;
  const target = Number(mode);
  const indexed = levels.map((l, i) => ({ i, side: shortSide(l), avc: (l.codecs ?? "").startsWith("avc1") }));
  const exact = indexed.filter((x) => x.side === target);
  if (exact.length > 0) return (exact.find((x) => x.avc) ?? exact[0]!).i;
  const below = indexed.filter((x) => x.side < target).sort((a, b) => b.side - a.side || Number(b.avc) - Number(a.avc));
  if (below.length > 0) return below[0]!.i;
  return indexed.sort((a, b) => a.side - b.side)[0]!.i;
}

/**
 * Lecture native (Safari/iPhone ancien) : choisit la variante dans la playlist principale.
 * Renvoie l'URL de la playlist principale en mode automatique ou si rien ne correspond.
 */
export function variantUrlFor(masterText: string, masterUrl: string, mode: QualityMode): string {
  if (mode === "auto") return masterUrl;
  const lines = masterText.split(/\r?\n/);
  const variants: (LevelInfo & { uri: string })[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.startsWith("#EXT-X-STREAM-INF:")) continue;
    const res = /RESOLUTION=(\d+)x(\d+)/.exec(line);
    const codecs = /CODECS="([^"]*)"/.exec(line)?.[1];
    const uri = lines[i + 1]?.trim();
    if (res && uri && !uri.startsWith("#")) variants.push({ width: Number(res[1]), height: Number(res[2]), codecs, uri });
  }
  const idx = pickLevel(variants, mode);
  if (idx < 0) return masterUrl;
  return new URL(variants[idx]!.uri, new URL(masterUrl, "http://base.invalid")).toString().replace(/^http:\/\/base\.invalid/, "");
}

/**
 * Connexion insuffisante pour la qualité choisie : au moins 2 coupures (mise en mémoire tampon)
 * en 30 secondes, ou une coupure de plus de 4 secondes. Jamais en mode automatique.
 */
export function shouldSuggestAuto(mode: QualityMode, stalls: readonly { at: number; durationMs: number }[], now: number): boolean {
  if (mode === "auto") return false;
  const recent = stalls.filter((s) => now - s.at <= 30_000);
  return recent.length >= 2 || recent.some((s) => s.durationMs >= 4_000);
}
