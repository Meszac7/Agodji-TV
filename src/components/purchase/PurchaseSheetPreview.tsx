import { Button } from "@/components/ui/Button";
import { ChevronDownIcon } from "@/components/ui/icons";
import { formatPrice, type CurrencyCode } from "@/lib/money";

/**
 * Aperçu statique de l'écran d'achat (identité visuelle uniquement).
 * Le parcours réel (pays de paiement confirmé, moyens disponibles) arrive aux étapes 2 (maquettes) et 5.
 */
export function PurchaseSheetPreview({
  seriesTitle,
  episodeTitle,
  episodeCount,
  price,
  countryLabel,
}: {
  seriesTitle: string;
  episodeTitle: string;
  episodeCount: number;
  price: { currency: CurrencyCode; episode: number; pass: number };
  countryLabel: string;
}) {
  const fullPrice = price.episode * episodeCount;
  const saving = fullPrice - price.pass;
  return (
    <div className="w-full max-w-[400px] rounded-t-[var(--radius-sheet)] border border-border bg-surface-raised p-4 shadow-[var(--shadow-raised)] sm:rounded-[var(--radius-sheet)]">
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" aria-hidden />
      <p className="text-[12px] uppercase tracking-[0.14em] text-muted">{seriesTitle}</p>
      <h3 className="mt-1 font-display text-xl font-bold">Débloquer « {episodeTitle} »</h3>

      <div className="mt-4 grid gap-3">
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-card)] border-2 border-primary bg-surface p-3">
          <span>
            <span className="flex items-center gap-2 font-display font-bold">
              Pass série
              <span className="rounded-[6px] bg-primary px-1.5 py-0.5 text-[11px] font-bold text-on-primary">Meilleure offre</span>
            </span>
            <span className="block text-[13px] text-muted">
              {episodeCount} épisodes, y compris les prochains
              {saving > 0 ? ` · ${formatPrice(saving, price.currency)} d'économie` : ""}
            </span>
          </span>
          <span className="font-display text-lg font-bold tabular-nums">{formatPrice(price.pass, price.currency)}</span>
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-3">
          <span>
            <span className="font-display font-bold">Cet épisode</span>
            <span className="block text-[13px] text-muted">Accès illimité, sans expiration</span>
          </span>
          <span className="font-display text-lg font-bold tabular-nums">{formatPrice(price.episode, price.currency)}</span>
        </label>
      </div>

      <button
        type="button"
        className="mt-4 flex w-full items-center justify-between rounded-[var(--radius-control)] bg-surface px-3 py-2.5 text-left text-[14px]"
      >
        <span>
          <span className="text-muted">Payer depuis : </span>
          <span className="font-medium">{countryLabel}</span>
        </span>
        <span className="flex items-center gap-1 text-primary-text">
          Changer <ChevronDownIcon width={16} height={16} />
        </span>
      </button>

      <Button fullWidth size="lg" className="mt-4">
        Payer avec Mobile Money
      </Button>
      <p className="mt-3 text-center text-[12px] text-muted">Achat définitif · Accès sans limite de durée</p>
    </div>
  );
}
