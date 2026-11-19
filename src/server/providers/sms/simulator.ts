import type { SmsProvider } from "./types";

/**
 * Simulateur SMS : les messages (codes OTP) sont gardés dans une « boîte d'envoi » visible
 * en développement / préproduction au lieu d'être envoyés. INTERDIT en production (SEC-44).
 */
export class SmsSimulator implements SmsProvider {
  readonly code = "simulator";
  readonly outbox: { to: string; text: string; at: Date }[] = [];

  async send(toE164: string, text: string) {
    if (!/^\+[1-9][0-9]{6,14}$/.test(toE164)) return { accepted: false };
    this.outbox.push({ to: toE164, text, at: new Date() });
    return { accepted: true, providerMessageId: `SIMSMS-${this.outbox.length}` };
  }
}
