import Razorpay from "razorpay";
import crypto from "crypto";
import type {
  IPaymentProvider,
  CreateCheckoutParams,
  CheckoutSession,
  WebhookEvent,
} from "../gateway.js";

export class RazorpayAdapter implements IPaymentProvider {
  readonly providerId = "RAZORPAY" as const;
  private client: Razorpay;
  private webhookSecret: string;

  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!keyId) throw new Error("RAZORPAY_KEY_ID is not set");
    if (!keySecret) throw new Error("RAZORPAY_KEY_SECRET is not set");
    if (!webhookSecret) throw new Error("RAZORPAY_WEBHOOK_SECRET is not set");

    this.webhookSecret = webhookSecret;
    this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  async createCheckoutSession(
    params: CreateCheckoutParams
  ): Promise<CheckoutSession> {
    // Razorpay uses Orders API — payment link generated client-side with order_id
    const order = await this.client.orders.create({
      amount: params.amount, // In paise (INR) or smallest unit
      currency: params.currency.toUpperCase(),
      receipt: params.invoiceId.slice(0, 40), // Max 40 chars
      notes: {
        invoiceId: params.invoiceId,
        customerEmail: params.customerEmail,
        ...(params.metadata ?? {}),
      },
    });

    // Construct a payment link using Razorpay Payment Links API
    const paymentLink = await this.client.paymentLink.create({
      amount: params.amount,
      currency: params.currency.toUpperCase(),
      description: params.description,
      customer: {
        name: params.customerName,
        email: params.customerEmail,
      },
      callback_url: params.successUrl,
      callback_method: "get",
      notes: { invoiceId: params.invoiceId },
    });

    return {
      sessionId: order.id,
      paymentUrl: paymentLink.short_url,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
    };
  }

  async verifyWebhookSignature(
    payload: string,
    signature: string
  ): Promise<boolean> {
    const expectedSignature = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(payload)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );
  }

  async parseWebhookEvent(payload: unknown): Promise<WebhookEvent> {
    const event = payload as {
      event: string;
      payload: {
        payment?: { entity?: { id?: string; order_id?: string; amount?: number; currency?: string } };
        payment_link?: { entity?: { notes?: { invoiceId?: string } } };
      };
    };

    const payment = event.payload.payment?.entity;
    const invoiceId = event.payload.payment_link?.entity?.notes?.invoiceId ?? undefined;

    return {
      eventId: payment?.id ?? crypto.randomUUID(),
      eventType: event.event,
      provider: "RAZORPAY",
      invoiceId,
      amount: payment?.amount,
      currency: payment?.currency,
      status:
        event.event === "payment.captured"
          ? "SUCCESS"
          : event.event === "payment.failed"
            ? "FAILED"
            : "PENDING",
      rawPayload: payload,
    };
  }

  async getPaymentStatus(
    orderId: string
  ): Promise<"PENDING" | "PAID" | "FAILED"> {
    const payments = await this.client.orders.fetchPayments(orderId);
    const items = payments.items as Array<{ status: string }>;
    const captured = items.find((p) => p.status === "captured");
    const failed = items.find((p) => p.status === "failed");
    if (captured) return "PAID";
    if (failed) return "FAILED";
    return "PENDING";
  }

  async refund(
    paymentId: string,
    amount?: number
  ): Promise<{ refundId: string }> {
    const refundData: Record<string, unknown> = { speed: "normal" };
    if (amount !== undefined) refundData["amount"] = amount;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refund = await (this.client.payments.refund(paymentId, refundData as any) as Promise<{ id: string }>);
    return { refundId: refund.id };
  }
}
