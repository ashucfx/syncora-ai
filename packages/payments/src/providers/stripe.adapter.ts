import Stripe from "stripe";
import type {
  IPaymentProvider,
  CreateCheckoutParams,
  CheckoutSession,
  WebhookEvent,
} from "../gateway.js";

export class StripeAdapter implements IPaymentProvider {
  readonly providerId = "STRIPE" as const;
  private client: Stripe;
  private webhookSecret: string;

  constructor() {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!apiKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    this.client = new Stripe(apiKey, { apiVersion: "2025-02-24.acacia" });
    this.webhookSecret = webhookSecret;
  }

  async createCheckoutSession(
    params: CreateCheckoutParams
  ): Promise<CheckoutSession> {
    const session = await this.client.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: params.customerEmail,
      line_items: [
        {
          price_data: {
            currency: params.currency.toLowerCase(),
            product_data: { name: params.description },
            unit_amount: params.amount, // Already in cents
          },
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        invoiceId: params.invoiceId,
        ...(params.metadata ?? {}),
      },
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24h
    });

    return {
      sessionId: session.id,
      paymentUrl: session.url!,
      expiresAt: new Date(session.expires_at * 1000),
    };
  }

  async verifyWebhookSignature(
    payload: string,
    signature: string
  ): Promise<boolean> {
    try {
      this.client.webhooks.constructEvent(payload, signature, this.webhookSecret);
      return true;
    } catch {
      return false;
    }
  }

  async parseWebhookEvent(payload: unknown): Promise<WebhookEvent> {
    const event = payload as Stripe.Event;

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        eventId: event.id,
        eventType: event.type,
        provider: "STRIPE",
        invoiceId: session.metadata?.invoiceId ?? undefined,
        amount: session.amount_total ?? undefined,
        currency: session.currency?.toUpperCase(),
        status: "SUCCESS",
        rawPayload: payload,
      };
    }

    if (event.type === "charge.refunded") {
      return {
        eventId: event.id,
        eventType: event.type,
        provider: "STRIPE",
        status: "REFUNDED",
        rawPayload: payload,
      };
    }

    return {
      eventId: event.id,
      eventType: event.type,
      provider: "STRIPE",
      status: "PENDING",
      rawPayload: payload,
    };
  }

  async getPaymentStatus(
    sessionId: string
  ): Promise<"PENDING" | "PAID" | "FAILED"> {
    const session = await this.client.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "paid") return "PAID";
    if (session.status === "expired") return "FAILED";
    return "PENDING";
  }

  async refund(
    paymentIntentId: string,
    amount?: number
  ): Promise<{ refundId: string }> {
    const refund = await this.client.refunds.create({
      payment_intent: paymentIntentId,
      ...(amount ? { amount } : {}),
    });
    return { refundId: refund.id };
  }
}
