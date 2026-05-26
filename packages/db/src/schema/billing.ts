import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  index,
  numeric,
  uniqueIndex,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./identity.js";
import { clients } from "./crm.js";
import { milestones } from "./projects.js";

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "DRAFT",
  "SENT",
  "VIEWED",
  "PAID",
  "OVERDUE",
  "CANCELLED",
  "REFUNDED",
]);

export const paymentProviderEnum = pgEnum("payment_provider", [
  "STRIPE",
  "RAZORPAY",
  "PAYPAL",
  "BANK_TRANSFER",
  "MANUAL",
]);

// ─────────────────────────────────────────────
// Invoice Line Items
// ─────────────────────────────────────────────

export const invoiceLineItems = pgTable("invoice_line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").notNull(), // FK set below
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(), // quantity * unitPrice
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("0"), // GST/VAT percentage
  position: integer("position").notNull().default(0),
});

// ─────────────────────────────────────────────
// Invoices
// ─────────────────────────────────────────────

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    milestoneId: uuid("milestone_id").references(() => milestones.id),
    number: text("number").notNull(), // INV-2024-001
    status: invoiceStatusEnum("status").notNull().default("DRAFT"),
    currency: text("currency").notNull().default("USD"),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
    taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    exchangeRate: numeric("exchange_rate", { precision: 10, scale: 6 }).default("1"),
    // Tax details (GST support)
    taxType: text("tax_type"), // 'GST' | 'VAT' | 'SALES_TAX' | null
    taxNumber: text("tax_number"), // GSTIN or VAT number
    notes: text("notes"),
    terms: text("terms"),
    // Payment
    paymentProvider: paymentProviderEnum("payment_provider"),
    paymentRef: text("payment_ref"), // External payment ID
    paymentUrl: text("payment_url"), // Hosted checkout link
    paymentMetadata: jsonb("payment_metadata").$type<Record<string, unknown>>(),
    // Dates
    issueDate: timestamp("issue_date", { withTimezone: true }).defaultNow().notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgIndex: index("idx_invoices_org").on(t.organizationId),
    clientIndex: index("idx_invoices_client").on(t.clientId),
    statusIndex: index("idx_invoices_status").on(t.status),
    numberOrgUnique: uniqueIndex("uq_invoice_number_org").on(t.organizationId, t.number),
  })
);

// ─────────────────────────────────────────────
// Payment Webhooks Log
// Idempotency: track processed webhooks to avoid double-processing
// ─────────────────────────────────────────────

export const paymentWebhooks = pgTable(
  "payment_webhooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id"),
    provider: paymentProviderEnum("provider").notNull(),
    eventId: text("event_id").notNull(), // Provider's event ID (idempotency key)
    eventType: text("event_type").notNull(), // 'payment.succeeded', 'refund.created'
    payload: jsonb("payload").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    eventIdIndex: uniqueIndex("uq_webhook_event_id").on(t.provider, t.eventId),
    orgIndex: index("idx_webhooks_org").on(t.organizationId),
  })
);

// ─────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────

export const invoicesRelations = relations(invoices, ({ one }) => ({
  organization: one(organizations, {
    fields: [invoices.organizationId],
    references: [organizations.id],
  }),
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  milestone: one(milestones, {
    fields: [invoices.milestoneId],
    references: [milestones.id],
  }),
}));
