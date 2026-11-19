import type { ReactNode } from "react";
import { CheckIcon, LockIcon } from "./icons";

export type BadgeKind = "free" | "price" | "owned" | "pass" | "soon" | "ai";

const styles: Record<BadgeKind, string> = {
  free: "bg-surface-raised text-text border border-border",
  price: "bg-transparent text-primary-text border border-primary/60",
  owned: "bg-surface-raised text-success border border-border",
  pass: "bg-surface-raised text-success border border-border",
  soon: "bg-overlay text-text border border-border backdrop-blur-sm",
  ai: "bg-transparent text-muted border border-border",
};

export function Badge({ kind, children }: { kind: BadgeKind; children: ReactNode }) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-[6px] px-2 text-[12px] font-medium tracking-[0.01em] ${styles[kind]}`}
    >
      {kind === "price" ? <LockIcon width={12} height={12} /> : null}
      {kind === "owned" || kind === "pass" ? <CheckIcon width={12} height={12} /> : null}
      {children}
    </span>
  );
}
