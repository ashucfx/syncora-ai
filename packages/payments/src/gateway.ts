import { z } from "zod";

// ─────────────────────────────────────────────
// Provider-agnostic payment interface
// Any payment gateway MUST implement this
// ─────────────────────────────────────────────

export interface CreateCheckoutParams {
  invoiceId: string;
  amount: number;        // In smallest currency unit (paise, cents)
  currency: string;      // ISO 4217 code
  customerEmail: string;
  customerName: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface CheckoutSession {
  sessionId: string;     // Provider's session/order ID
  paymentUrl: string;    // Redirect URL for client
  expiresAt: Date;
}

export interface WebhookEvent {
  eventId: string;
  eventType: string;
  provider: "STRIPE" | "RAZORPAY" | "PAYPAL";
  invoiceId?: string;
  amount?: number;
  currency?: string;
  status: "SUCCESS" | "FAILED" | "PENDING" | "REFUNDED";
  rawPayload: unknown;
}

export interface IPaymentProvider {
  readonly providerId: "STRIPE" | "RAZORPAY" | "PAYPAL";

  createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSession>;
  verifyWebhookSignature(payload: string, signature: string): Promise<boolean>;
  parseWebhookEvent(payload: unknown): Promise<WebhookEvent>;
  getPaymentStatus(paymentRef: string): Promise<"PENDING" | "PAID" | "FAILED">;
  refund(paymentRef: string, amount?: number): Promise<{ refundId: string }>;
}

// ─────────────────────────────────────────────
// Payment Gateway — orchestrates providers
// ─────────────────────────────────────────────

export class PaymentGateway {
  private providers = new Map<string, IPaymentProvider>();

  register(provider: IPaymentProvider): void {
    this.providers.set(provider.providerId, provider);
  }

  get(providerId: string): IPaymentProvider {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Payment provider "${providerId}" is not registered`);
    }
    return provider;
  }

  getAll(): IPaymentProvider[] {
    return Array.from(this.providers.values());
  }
}

// Singleton gateway instance
export const paymentGateway = new PaymentGateway();

// ─────────────────────────────────────────────
// Webhook payload validation schema
// ─────────────────────────────────────────────

export const webhookVerificationSchema = z.object({
  provider: z.enum(["STRIPE", "RAZORPAY", "PAYPAL"]),
  rawBody: z.string(),
  signature: z.string(),
});
