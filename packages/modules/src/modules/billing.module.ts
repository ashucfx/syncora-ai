import type { SyncoraModule } from "../types.js";

export const billingModule: SyncoraModule = {
  id: "billing",
  version: "1.0.0",
  displayName: "Billing & Invoicing",
  description: "Generate professional invoices, track payments, support Stripe & Razorpay",
  icon: "credit-card",
  navigation: [
    { label: "Billing", href: "/billing", icon: "📄" }
  ],
  permissions: [
    {
      key: "billing:read",
      description: "View invoices",
      defaultRoles: ["OWNER", "ADMIN", "MEMBER"]
    },
    {
      key: "billing:write",
      description: "Create and edit invoices",
      defaultRoles: ["OWNER", "ADMIN"]
    },
    {
      key: "billing:pay",
      description: "Pay invoices (for client portal)",
      defaultRoles: ["OWNER", "ADMIN", "MEMBER", "GUEST"]
    }
  ],
  requiredPlan: "pro",
  webhookEvents: ["invoice.created", "invoice.paid", "invoice.voided"]
};
