export {
  PaymentGateway,
  paymentGateway,
  webhookVerificationSchema,
} from "./gateway.js";
export type {
  IPaymentProvider,
  CreateCheckoutParams,
  CheckoutSession,
  WebhookEvent,
} from "./gateway.js";
export { StripeAdapter } from "./providers/stripe.adapter.js";
export { RazorpayAdapter } from "./providers/razorpay.adapter.js";

// ─────────────────────────────────────────────
// Bootstrap: register active providers on import
// Providers are only instantiated if env vars exist
// ─────────────────────────────────────────────

import { paymentGateway as gateway } from "./gateway.js";
import { StripeAdapter } from "./providers/stripe.adapter.js";
import { RazorpayAdapter } from "./providers/razorpay.adapter.js";

if (process.env.STRIPE_SECRET_KEY) {
  gateway.register(new StripeAdapter());
}

if (process.env.RAZORPAY_KEY_ID) {
  gateway.register(new RazorpayAdapter());
}
