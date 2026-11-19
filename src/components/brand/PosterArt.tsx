import type { PosterPalette } from "@/lib/demo/catalog";

/**
 * Visuel d'affiche provisoire (dégradés) en attendant les vraies affiches.
 * Remplacé par une image optimisée dès que les affiches officielles sont fournies.
 */
export function PosterArt({
  palette,
  title,
  showTitle = true,
  className = "",
  titleSize = "md",
}: {
  palette: PosterPalette;
  title: string;
  showTitle?: boolean;
  className?: string;
  titleSize?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "text-[15px]", md: "text-xl", lg: "text-4xl md:text-6xl" } as const;
  return (
    <div
      className={`relative isolate overflow-hidden ${className}`}
      style={{
        backgroundImage: [
          `radial-gradient(120% 70% at 70% 18%, ${palette.glow}55 0%, transparent 55%)`,
          `radial-gradient(90% 60% at 15% 85%, ${palette.to}66 0%, transparent 60%)`,
          `linear-gradient(160deg, ${palette.from} 0%, ${palette.via} 55%, ${palette.to} 100%)`,
        ].join(","),
      }}
      role="img"
      aria-label={`Affiche provisoire : ${title}`}
    >
      {/* Faisceaux lumineux discrets — ambiance « salle de cinéma » */}
      <div
        className="absolute inset-0 opacity-30 mix-blend-soft-light"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, rgba(255,255,255,0.18) 0px, rgba(255,255,255,0.18) 1px, transparent 1px, transparent 14px)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      {showTitle ? (
        <div className="absolute inset-x-0 bottom-0 p-3 md:p-4">
          <p
            className={`font-display font-extrabold uppercase leading-[0.95] tracking-[0.02em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] ${sizes[titleSize]}`}
          >
            {title}
          </p>
        </div>
      ) : null}
    </div>
  );
}
