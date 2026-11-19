/**
 * Logotype TEXTE PROVISOIRE (D-14) : remplacé par le logo officiel dès qu'il est fourni.
 */
export function Wordmark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "text-lg", md: "text-2xl", lg: "text-5xl md:text-6xl" } as const;
  return (
    <span className={`inline-flex items-baseline gap-1.5 font-display font-extrabold tracking-[-0.01em] ${sizes[size]}`}>
      <span className="text-text">Agodjié</span>
      <span className="rounded-[6px] bg-primary px-1.5 text-[0.62em] leading-[1.35] text-on-primary">TV</span>
    </span>
  );
}
