import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { isProduction } from "@/lib/env";

/** Page d'accueil provisoire (étape 1). Le vrai site public arrive à l'étape 2. */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-4 text-center">
      <Wordmark size="lg" />
      <p className="text-lg text-muted">Séries dramatiques africaines. Bientôt disponible.</p>
      {!isProduction() ? (
        <Link
          href="/guide-de-style"
          className="inline-flex h-12 items-center rounded-[var(--radius-control)] bg-primary px-6 font-display font-bold text-on-primary hover:bg-primary-hover"
        >
          Voir le guide de style
        </Link>
      ) : null}
    </main>
  );
}
