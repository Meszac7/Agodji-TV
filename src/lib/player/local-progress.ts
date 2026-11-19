/** Progression des visiteurs, stockée sur l'appareil (FR-37). Ne fait jamais planter la page si le stockage est indisponible. */
import type { EpisodeProgress } from "./sequencer";

export type Progress = Map<string, EpisodeProgress>;

export function loadProgress(key: string): Progress {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Map();
    const obj = JSON.parse(raw) as Record<string, EpisodeProgress>;
    return new Map(Object.entries(obj));
  } catch {
    return new Map();
  }
}

export function saveProgress(key: string, progress: Progress): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(Object.fromEntries(progress)));
  } catch {
    /* stockage indisponible : la reprise ne sera simplement pas mémorisée */
  }
}

export function clearProgress(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignoré */
  }
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
