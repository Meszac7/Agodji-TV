import { GridIcon, HomeIcon, LibraryIcon, UserIcon } from "@/components/ui/icons";

const items = [
  { label: "Accueil", icon: HomeIcon, active: true },
  { label: "Catalogue", icon: GridIcon, active: false },
  { label: "Bibliothèque", icon: LibraryIcon, active: false },
  { label: "Compte", icon: UserIcon, active: false },
];

/** Barre de navigation mobile (< 640 px) — aperçu d'identité. */
export function BottomNavPreview() {
  return (
    <nav aria-label="Navigation principale (aperçu)" className="w-full max-w-[400px] rounded-[var(--radius-card)] border border-border bg-surface-raised">
      <ul className="grid grid-cols-4">
        {items.map(({ label, icon: Icon, active }) => (
          <li key={label}>
            <span
              className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium ${active ? "text-primary-text" : "text-muted"}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon width={22} height={22} />
              {label}
            </span>
          </li>
        ))}
      </ul>
    </nav>
  );
}
