export interface SmsProvider {
  readonly code: string;
  send(toE164: string, text: string): Promise<{ accepted: boolean; providerMessageId?: string }>;
}
