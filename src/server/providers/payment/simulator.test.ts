import { describe, expect, it } from "vitest";
import { PaymentSimulator, SIMULATOR_SIGNATURE_HEADER } from "./simulator";
import { AmountNotAllowedError, assertAmountAllowed, type CheckoutRequest, type PaymentAccountConfig } from "./types";
import { SimulatorForbiddenError, createPaymentProvider } from "../registry";

const env = { PAYACCT_SIM_A_WEBHOOK_SECRET: "secret-du-compte-a-0123456789", PAYACCT_SIM_B_WEBHOOK_SECRET: "secret-du-compte-b-9876543210" };
const accountA: PaymentAccountConfig = {
  code: "sim-a", providerCode: "simulator", currencies: ["XOF"], environment: "sandbox",
  credentialsRef: "PAYACCT_SIM_A", constraints: { amountStep: 5 },
};
const accountB: PaymentAccountConfig = { ...accountA, code: "sim-b", credentialsRef: "PAYACCT_SIM_B" };
const request: CheckoutRequest = {
  orderReference: "ORD-TEST-1", amount: 300, currency: "XOF", method: "mobile_money", country: "BJ",
  returnUrl: "http://localhost:3000/paiement/retour", notifyUrl: "http://localhost:3000/api/webhooks/simulator/sim-a",
  description: "Épisode 5",
};

async function started() {
  const sim = new PaymentSimulator(env);
  await sim.createCheckout(request, accountA);
  return sim;
}

describe("simulateur de paiement", () => {
  it("renvoie une URL de paiement simulée", async () => {
    const sim = new PaymentSimulator(env);
    const { redirectUrl } = await sim.createCheckout(request, accountA);
    expect(redirectUrl).toContain("/simulateur-paiement?ref=ORD-TEST-1");
  });

  it("une notification correctement signée est authentique, mais ne contient pas le statut", async () => {
    const sim = await started();
    const n = sim.complete("ORD-TEST-1", "paid", accountA);
    const check = await sim.authenticateNotification(n, accountA);
    expect(check).toMatchObject({ authentic: true, orderReference: "ORD-TEST-1" });
    expect(n.rawBody).not.toContain("paid");
  });

  it("le statut réel s'obtient auprès du prestataire", async () => {
    const sim = await started();
    sim.complete("ORD-TEST-1", "paid", accountA);
    expect(await sim.fetchTransactionStatus("ORD-TEST-1")).toMatchObject({ status: "paid", amount: 300, currency: "XOF" });
  });

  it("rejette une notification falsifiée (corps modifié)", async () => {
    const sim = await started();
    const n = sim.complete("ORD-TEST-1", "paid", accountA);
    const forged = { ...n, rawBody: n.rawBody.replace("ORD-TEST-1", "ORD-TEST-2") };
    expect(await sim.authenticateNotification(forged, accountA)).toEqual({ authentic: false, reason: "Signature invalide" });
  });

  it("rejette une notification sans signature", async () => {
    const sim = await started();
    const n = sim.complete("ORD-TEST-1", "paid", accountA);
    expect((await sim.authenticateNotification({ ...n, headers: {} }, accountA)).authentic).toBe(false);
  });

  it("rejette une notification signée avec le secret d'un autre compte (SEC-32)", async () => {
    const sim = await started();
    const n = sim.complete("ORD-TEST-1", "paid", accountA);
    expect((await sim.authenticateNotification(n, accountB)).authentic).toBe(false);
  });

  it("produit des doublons identiques (pour tester l'idempotence)", async () => {
    const sim = await started();
    const first = sim.complete("ORD-TEST-1", "paid", accountA);
    const again = sim.renotify("ORD-TEST-1", accountA);
    expect(again.rawBody).toBe(first.rawBody);
    expect(again.headers[SIMULATOR_SIGNATURE_HEADER]).toBe(first.headers[SIMULATOR_SIGNATURE_HEADER]);
  });

  it("simule un paiement d'un montant erroné", async () => {
    const sim = await started();
    sim.complete("ORD-TEST-1", "paid_wrong_amount", accountA);
    expect((await sim.fetchTransactionStatus("ORD-TEST-1")).amount).not.toBe(300);
  });

  it("simule un échec puis un succès tardif (le prestataire a le dernier mot)", async () => {
    const sim = await started();
    sim.complete("ORD-TEST-1", "failed", accountA);
    expect((await sim.fetchTransactionStatus("ORD-TEST-1")).status).toBe("failed");
    sim.complete("ORD-TEST-1", "paid", accountA);
    expect((await sim.fetchTransactionStatus("ORD-TEST-1")).status).toBe("paid");
  });

  it("refuse une devise non acceptée par le compte", async () => {
    const sim = new PaymentSimulator(env);
    await expect(sim.createCheckout({ ...request, currency: "XAF" }, accountA)).rejects.toThrow(/devise/);
  });

  it("refuse un montant contraire aux contraintes du compte", async () => {
    const sim = new PaymentSimulator(env);
    await expect(sim.createCheckout({ ...request, amount: 302 }, accountA)).rejects.toThrow(AmountNotAllowedError);
  });

  it("échoue clairement si l'identifiant du compte est absent de la configuration", async () => {
    const sim = new PaymentSimulator({});
    await sim.createCheckout(request, accountA);
    expect(() => sim.complete("ORD-TEST-1", "paid", accountA)).toThrow(/PAYACCT_SIM_A_WEBHOOK_SECRET/);
  });
});

describe("contraintes de montant", () => {
  it("multiple, minimum et maximum", () => {
    expect(() => assertAmountAllowed(300, { amountStep: 5 })).not.toThrow();
    expect(() => assertAmountAllowed(303, { amountStep: 5 })).toThrow(AmountNotAllowedError);
    expect(() => assertAmountAllowed(50, { minAmount: 100 })).toThrow(AmountNotAllowedError);
    expect(() => assertAmountAllowed(5000, { maxAmount: 1000 })).toThrow(AmountNotAllowedError);
    expect(() => assertAmountAllowed(0, {})).toThrow(AmountNotAllowedError);
  });
});

describe("registre des prestataires (SEC-44)", () => {
  it("fournit le simulateur hors production", () => {
    expect(createPaymentProvider("simulator", { APP_ENV: "development" }).code).toBe("simulator");
  });
  it("refuse le simulateur en production", () => {
    expect(() => createPaymentProvider("simulator", { APP_ENV: "production" })).toThrow(SimulatorForbiddenError);
  });
  it("refuse un prestataire inconnu ou pas encore intégré", () => {
    expect(() => createPaymentProvider("cinetpay", { APP_ENV: "development" })).toThrow(/non disponible/);
  });
});
