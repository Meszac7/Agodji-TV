/**
 * Formatage des montants. Les montants sont des entiers dans la plus petite unité
 * de la devise (DATABASE_SCHEMA §1). Aucune conversion entre devises n'est faite ici.
 */
export type CurrencyCode = "XOF" | "XAF" | "GNF" | "CDF" | "USD";

const CURRENCIES: Record<CurrencyCode, { minorUnits: number; label: string; position: "after" | "after-symbol" }> = {
  XOF: { minorUnits: 0, label: "FCFA", position: "after" },
  XAF: { minorUnits: 0, label: "FCFA", position: "after" },
  GNF: { minorUnits: 0, label: "GNF", position: "after" },
  CDF: { minorUnits: 2, label: "FC", position: "after" },
  USD: { minorUnits: 2, label: "$", position: "after-symbol" },
};

export function isCurrencyCode(value: string): value is CurrencyCode {
  return Object.hasOwn(CURRENCIES, value);
}

/** Ex. formatPrice(1500, "XOF") → "1 500 FCFA" ; formatPrice(50, "USD") → "0,50 $". */
export function formatPrice(amountMinor: number, currency: CurrencyCode): string {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) {
    throw new RangeError("Le montant doit être un entier positif ou nul (plus petite unité de la devise).");
  }
  const { minorUnits, label } = CURRENCIES[currency];
  const value = amountMinor / 10 ** minorUnits;
  const number = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: minorUnits,
    maximumFractionDigits: minorUnits,
  }).format(value);
  return `${number} ${label}`;
}
