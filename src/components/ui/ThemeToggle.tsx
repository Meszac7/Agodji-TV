"use client";

import { useState } from "react";
import { MoonIcon, SunIcon } from "./icons";
import { THEME_COOKIE, type Theme } from "@/lib/theme";

/** Bascule sombre / clair ; le choix est mémorisé dans un cookie (lu côté serveur, sans flash). */
export function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);
  const next: Theme = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => {
        document.documentElement.dataset.theme = next;
        document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        setTheme(next);
      }}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface-raised px-3 text-[13px] font-medium"
      aria-label={`Passer au thème ${next === "dark" ? "sombre" : "clair"}`}
      data-testid="theme-toggle"
    >
      {theme === "dark" ? <MoonIcon width={16} height={16} /> : <SunIcon width={16} height={16} />}
      {theme === "dark" ? "Sombre" : "Clair"}
    </button>
  );
}
