import { isProduction } from "@/lib/env";
import { PaymentSimulator } from "./payment/simulator";
import type { PaymentProvider } from "./payment/types";

export class SimulatorForbiddenError extends Error {
  override name = "SimulatorForbiddenError";
}

/**
 * Résout l'adaptateur d'un prestataire à partir de son code (payment_providers.code).
 * Les adaptateurs réels (cinetpay, fedapay) sont ajoutés à l'étape 7.
 */
export function createPaymentProvider(code: string, env: Record<string, string | undefined> = process.env): PaymentProvider {
  if (code === "simulator") {
    if (isProduction(env)) throw new SimulatorForbiddenError("Simulateur de paiement interdit en production (SEC-44)");
    return new PaymentSimulator(env);
  }
  throw new Error(`Prestataire de paiement non disponible : ${code}`);
}
