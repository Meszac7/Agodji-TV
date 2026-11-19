/**
 * Simulateur de paiement (développement, préproduction, tests) — TECHNICAL_ARCHITECTURE §12.
 * Il reproduit les comportements d'un vrai prestataire : page de paiement, notifications signées
 * (éventuellement répétées, tardives ou perdues), statut consultable, montant erroné.
 * INTERDIT en production (SEC-44) : voir registry.ts.
 */
import type { CurrencyCode } from "@/lib/money";
import { hmacSha256Hex, safeEqualHex } from "../crypto";
import {
  assertAmountAllowed,
  readAccountSecret,
  type CheckoutRequest,
  type IncomingNotification,
  type NotificationCheck,
  type PaymentAccountConfig,
  type PaymentProvider,
  type ProviderTransactionStatus,
  type TransactionStatus,
} from "./types";

export type SimulatedOutcome = "paid" | "failed" | "cancelled" | "paid_wrong_amount";

type SimTransaction = {
  orderReference: string;
  amount: number;
  currency: CurrencyCode;
  status: ProviderTransactionStatus;
  paidAmount: number;
  providerTransactionId: string;
  notifyUrl: string;
  /** Numéro d'événement : change à chaque changement de statut, identique pour un doublon. */
  eventSeq: number;
};

export const SIMULATOR_SIGNATURE_HEADER = "x-simulator-signature";

export class PaymentSimulator implements PaymentProvider {
  readonly code = "simulator";
  private readonly transactions = new Map<string, SimTransaction>();
  private counter = 0;

  constructor(private readonly env: Record<string, string | undefined> = process.env) {}

  async createCheckout(request: CheckoutRequest, account: PaymentAccountConfig): Promise<{ redirectUrl: string }> {
    if (!account.currencies.includes(request.currency)) {
      throw new Error(`Le compte ${account.code} n'accepte pas la devise ${request.currency}`);
    }
    assertAmountAllowed(request.amount, account.constraints);
    this.counter += 1;
    this.transactions.set(request.orderReference, {
      orderReference: request.orderReference,
      amount: request.amount,
      currency: request.currency,
      status: "pending",
      paidAmount: request.amount,
      providerTransactionId: `SIM-${String(this.counter).padStart(6, "0")}`,
      notifyUrl: request.notifyUrl,
      eventSeq: 0,
    });
    const url = new URL("/simulateur-paiement", request.returnUrl);
    url.searchParams.set("ref", request.orderReference);
    return { redirectUrl: url.toString() };
  }

  /** Simule le choix de l'utilisateur sur la page de paiement et renvoie la notification signée. */
  complete(orderReference: string, outcome: SimulatedOutcome, account: PaymentAccountConfig): IncomingNotification {
    const tx = this.transactions.get(orderReference);
    if (!tx) throw new Error(`Transaction simulée inconnue : ${orderReference}`);
    tx.eventSeq += 1;
    if (outcome === "paid_wrong_amount") {
      tx.status = "paid";
      tx.paidAmount = tx.amount - 100;
    } else {
      tx.status = outcome;
    }
    return this.buildNotification(tx, account);
  }

  /** Renvoie la même notification (doublon), comme le font les vrais prestataires. */
  renotify(orderReference: string, account: PaymentAccountConfig): IncomingNotification {
    const tx = this.transactions.get(orderReference);
    if (!tx) throw new Error(`Transaction simulée inconnue : ${orderReference}`);
    return this.buildNotification(tx, account);
  }

  async authenticateNotification(input: IncomingNotification, account: PaymentAccountConfig): Promise<NotificationCheck> {
    const signature = input.headers[SIMULATOR_SIGNATURE_HEADER];
    if (!signature) return { authentic: false, reason: "Signature absente" };
    const expected = hmacSha256Hex(readAccountSecret(account, "WEBHOOK_SECRET", this.env), input.rawBody);
    if (!safeEqualHex(signature, expected)) return { authentic: false, reason: "Signature invalide" };
    let body: { reference?: unknown; event_id?: unknown };
    try {
      body = JSON.parse(input.rawBody);
    } catch {
      return { authentic: false, reason: "Corps illisible" };
    }
    if (typeof body.reference !== "string" || typeof body.event_id !== "string") {
      return { authentic: false, reason: "Champs manquants" };
    }
    // La notification ne transporte volontairement PAS le statut : il faut interroger fetchTransactionStatus.
    return { authentic: true, orderReference: body.reference, eventKey: body.event_id };
  }

  async fetchTransactionStatus(orderReference: string): Promise<TransactionStatus> {
    const tx = this.transactions.get(orderReference);
    if (!tx) throw new Error(`Transaction simulée inconnue : ${orderReference}`);
    return {
      orderReference,
      status: tx.status,
      amount: tx.status === "paid" ? tx.paidAmount : tx.amount,
      currency: tx.currency,
      providerTransactionId: tx.providerTransactionId,
    };
  }

  private buildNotification(tx: SimTransaction, account: PaymentAccountConfig): IncomingNotification {
    const rawBody = JSON.stringify({ reference: tx.orderReference, event_id: `${tx.providerTransactionId}-evt-${tx.eventSeq}` });
    const signature = hmacSha256Hex(readAccountSecret(account, "WEBHOOK_SECRET", this.env), rawBody);
    return { headers: { [SIMULATOR_SIGNATURE_HEADER]: signature, "content-type": "application/json" }, rawBody };
  }
}
