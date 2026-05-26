import { type NextRequest, NextResponse } from "next/server";
import { paymentGateway } from "@syncora/payments";
import { webhookRelayQueue } from "@syncora/queue";
import { db, paymentWebhooks } from "@syncora/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const rawBody = await req.text();
  const signature =
    req.headers.get("stripe-signature") ??
    req.headers.get("x-razorpay-signature") ??
    req.headers.get("paypal-transmission-sig") ??
    "";

  const providerKey = provider.toUpperCase() as "STRIPE" | "RAZORPAY" | "PAYPAL";

  let gateway: ReturnType<typeof paymentGateway.get>;
  try {
    gateway = paymentGateway.get(providerKey);
  } catch {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  // ── Verify signature FIRST — reject anything that fails ───────
  const isValid = await gateway.verifyWebhookSignature(rawBody, signature);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // ── Parse event ───────────────────────────────────────────────
  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  const event = await gateway.parseWebhookEvent(payload);

  // ── Idempotency check — skip if already processed ─────────────
  const existing = await db.query.paymentWebhooks.findFirst({
    where: (w, { and, eq }) =>
      and(eq(w.provider, providerKey), eq(w.eventId, event.eventId)),
    columns: { id: true, processedAt: true },
  });

  if (existing?.processedAt) {
    return NextResponse.json({ received: true, status: "already_processed" });
  }

  // ── Log webhook ───────────────────────────────────────────────
  await db.insert(paymentWebhooks).values({
    provider: providerKey,
    eventId: event.eventId,
    eventType: event.eventType,
    payload: payload,
  });

  // ── Relay to queue for processing ─────────────────────────────
  await webhookRelayQueue.add(
    `${providerKey.toLowerCase()}-${event.eventType}`,
    {
      provider: providerKey,
      eventId: event.eventId,
      eventType: event.eventType,
      payload,
      signature,
    },
    { jobId: `webhook-${providerKey}-${event.eventId}` } // Idempotent job ID
  );

  return NextResponse.json({ received: true });
}
