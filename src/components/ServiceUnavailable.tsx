import { Wordmark } from "@/components/brand/Wordmark";

/** Message clair quand le catalogue ne répond pas (FR-43). */
export function ServiceUnavailable() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 px-4 text-center" data-theme="dark" role="alert">
      <Wordmark size="sm" />
      <p className="text-lg">Le catalogue est momentanément indisponible.</p>
      <p className="text-muted">Réessayez dans quelques instants.</p>
    </main>
  );
}
