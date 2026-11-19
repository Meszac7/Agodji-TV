import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  // Jaune royal : action principale uniquement (un seul par écran ou par carte).
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  secondary: "bg-surface-raised text-text border border-border hover:border-muted",
  ghost: "bg-transparent text-text hover:bg-surface-raised",
  // Rouge : actions critiques ou destructives uniquement.
  danger: "bg-danger-solid text-on-danger hover:brightness-110",
};

const sizes: Record<ButtonSize, string> = {
  md: "h-11 px-4 text-[15px]",
  lg: "h-12 px-6 text-base",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  fullWidth = false,
  disabled,
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        "inline-flex select-none items-center justify-center gap-2 rounded-[var(--radius-control)] font-display font-bold tracking-[0.01em] transition-[background-color,border-color,filter,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100",
        variants[variant],
        sizes[size],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
    >
      {loading ? (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />
      ) : (
        icon
      )}
      <span>{children}</span>
    </button>
  );
}
