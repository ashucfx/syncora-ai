import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  jsonb,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────
// Audit Logs
// Immutable append-only log of all state mutations
// ─────────────────────────────────────────────

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    userId: uuid("user_id"), // null = system action
    userEmail: text("user_email"), // Denormalized for log readability
    action: text("action").notNull(), // 'INVOICE_CREATED' | 'TASK_STATUS_CHANGED'
    entityType: text("entity_type").notNull(), // 'INVOICE' | 'TASK' | 'PROJECT'
    entityId: text("entity_id").notNull(),
    before: jsonb("before"), // State before change (null for creates)
    after: jsonb("after"), // State after change (null for deletes)
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    requestId: text("request_id"), // Trace correlation ID
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    orgIndex: index("idx_audit_org").on(t.organizationId),
    entityIndex: index("idx_audit_entity").on(t.entityType, t.entityId),
    userIndex: index("idx_audit_user").on(t.userId),
    createdIndex: index("idx_audit_created").on(t.createdAt),
  })
);

// ─────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    userId: uuid("user_id").notNull(), // Recipient
    type: text("type").notNull(), // 'TASK_ASSIGNED' | 'INVOICE_PAID' | 'MENTION'
    title: text("title").notNull(),
    body: text("body"),
    entityType: text("entity_type"), // Deep link context
    entityId: text("entity_id"),
    href: text("href"), // Frontend route to navigate to
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    userIndex: index("idx_notif_user").on(t.userId),
    orgIndex: index("idx_notif_org").on(t.organizationId),
    readIndex: index("idx_notif_read").on(t.readAt),
  })
);
