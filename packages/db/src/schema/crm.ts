import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  index,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./identity.js";

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export const clientStatusEnum = pgEnum("client_status", [
  "LEAD",
  "PROSPECT",
  "ACTIVE",
  "INACTIVE",
  "CHURNED",
]);

export const contactTypeEnum = pgEnum("contact_type", [
  "PRIMARY",
  "BILLING",
  "TECHNICAL",
  "OTHER",
]);

// ─────────────────────────────────────────────
// Clients (Companies / Individuals)
// ─────────────────────────────────────────────

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    company: text("company"),
    website: text("website"),
    status: clientStatusEnum("status").notNull().default("LEAD"),
    avatarUrl: text("avatar_url"),
    address: jsonb("address").$type<{
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
    }>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    notes: text("notes"),
    // Portal access: clients can log in via Supabase Auth
    portalUserId: uuid("portal_user_id"), // Links to auth.users if portal enabled
    portalEnabled: boolean("portal_enabled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    orgIndex: index("idx_clients_org").on(t.organizationId),
    statusIndex: index("idx_clients_status").on(t.status),
    emailIndex: index("idx_clients_email").on(t.email),
  })
);

// ─────────────────────────────────────────────
// Contacts (Multiple contacts per client)
// ─────────────────────────────────────────────

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    jobTitle: text("job_title"),
    type: contactTypeEnum("type").notNull().default("PRIMARY"),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    clientIndex: index("idx_contacts_client").on(t.clientId),
    orgIndex: index("idx_contacts_org").on(t.organizationId),
  })
);

// ─────────────────────────────────────────────
// CRM Notes / Activity
// ─────────────────────────────────────────────

export const clientNotes = pgTable(
  "client_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull(), // organization user
    content: text("content").notNull(),
    type: text("type").notNull().default("NOTE"), // NOTE | CALL | EMAIL | MEETING
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    clientIndex: index("idx_client_notes_client").on(t.clientId),
    orgIndex: index("idx_client_notes_org").on(t.organizationId),
  })
);

// ─────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────

export const clientsRelations = relations(clients, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [clients.organizationId],
    references: [organizations.id],
  }),
  contacts: many(contacts),
  notes: many(clientNotes),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  client: one(clients, {
    fields: [contacts.clientId],
    references: [clients.id],
  }),
}));

export const clientNotesRelations = relations(clientNotes, ({ one }) => ({
  client: one(clients, {
    fields: [clientNotes.clientId],
    references: [clients.id],
  }),
}));
