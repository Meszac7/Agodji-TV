export const THEME_COOKIE = "agodjie-theme";
export type Theme = "dark" | "light";
export const DEFAULT_THEME: Theme = "dark";

export function parseTheme(value: string | undefined | null): Theme {
  return value === "light" || value === "dark" ? value : DEFAULT_THEME;
}
