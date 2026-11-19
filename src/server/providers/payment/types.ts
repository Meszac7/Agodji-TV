/**
 * Interface commune des prestataires de paiement (TECHNICAL_ARCHITECTURE §5.6).
 * Le moteur (commandes, droits) ne dépend que de cette interface : ajouter un prestataire
 * revient à écrire un adaptateur qui passe la suite de tests de contrat commune.
 */
import type { CurrencyCode } from "@/lib/money";

export type PaymentMethod = "mobile_money" | "card" | "wallet";
export type ProviderTransactionStatus = "pending" | "paid" | "failed" | "cancelled";

export type AmountConstraints = {
  /** Le montant doit être un multiple de cette valeur (ex. 5 chez CinetPay hors USD — à reconfirmer). */
  amountStep?: number;
  minAmount?: number;
  maxAmount?: number;
};

export type PaymentAccountConfig = {
  code: string;
  providerCode: string;
  currencies: CurrencyCode[];
  environment: "sandbox" | "live";
  /** Préfixe des variables d'environnement contenant les identifiants (jamais les clés elles-mêmes). */
  credentialsRef: string;
  constraints: AmountConstraints;
};

export type CheckoutRequest = {
  orderReference: string;
  amount: number;
  currency: CurrencyCode;
  method: PaymentMethod;
  country: string;
  returnUrl: string;
  notifyUrl: string;
  description: string;
};

export type IncomingNotification = {
  headers: Record<string, string | undefined>;
  rawBody: string;
};

export type NotificationCheck =
  | { authentic: true; orderReference: string; eventKey: string }
  | { authentic: false; reason: string };

export type TransactionStatus = {
  orderReference: string;
  status: ProviderTransactionStatus;
  amount: number;
  currency: CurrencyCode;
  providerTransactionId: string;
};

export interface PaymentProvider {
  readonly code: string;
  createCheckout(request: CheckoutRequest, account: PaymentAccountConfig): Promise<{ redirectUrl: string }>;
  /** Authentifie la notification avec le secret DE CE COMPTE. N'accorde jamais de droit à elle seule. */
  authenticateNotification(input: IncomingNotification, account: PaymentAccountConfig): Promise<NotificationCheck>;
  /** Statut réel auprès du prestataire : c'est lui qui fait foi (SEC-33). */
  fetchTransactionStatus(orderReference: string, account: PaymentAccountConfig): Promise<TransactionStatus>;
}

export class AmountNotAllowedError extends Error {
  override name = "AmountNotAllowedError";
}

/** Vérifie un montant contre les contraintes d'un compte (utilisé à la saisie des prix et au paiement). */
export function assertAmountAllowed(amount: number, constraints: AmountConstraints): void {
  if (!Number.isInteger(amount) || amount <= 0) throw new AmountNotAllowedError("Montant invalide");
  if (constraints.minAmount !== undefined && amount < constraints.minAmount) {
    throw new AmountNotAllowedError(`Montant inférieur au minimum (${constraints.minAmount})`);
  }
  if (constraints.maxAmount !== undefined && amount > constraints.maxAmount) {
    throw new AmountNotAllowedError(`Montant supérieur au maximum (${constraints.maxAmount})`);
  }
  if (constraints.amountStep !== undefined && amount % constraints.amountStep !== 0) {
    throw new AmountNotAllowedError(`Le montant doit être un multiple de ${constraints.amountStep}`);
  }
}

export function readAccountSecret(
  account: PaymentAccountConfig,
  name: string,
  env: Record<string, string | undefined> = process.env,
): string {
  const value = env[`${account.credentialsRef}_${name}`];
  if (!value) throw new Error(`Identifiant manquant : ${account.credentialsRef}_${name}`);
  return value;
}
