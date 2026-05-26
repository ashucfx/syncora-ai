import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export const globalRoleEnum = pgEnum("global_role", [
  "OWNER",
  "ADMIN",
  "MEMBER",
  "GUEST",
]);

// ─────────────────────────────────────────────
// Users
// Maps 1:1 with Supabase Auth `auth.users`
// ─────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // Must match Supabase auth.users.id
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─────────────────────────────────────────────
// Organizations (Tenants)
// ─────────────────────────────────────────────

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  website: text("website"),
  industry: text("industry"),
  planId: text("plan_id").notNull().default("free"), // 'free' | 'pro' | 'enterprise'
  isActive: boolean("is_active").notNull().default(true),
  settings: text("settings").default("{}"), // JSON stored as text for edge compat
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─────────────────────────────────────────────
// Organization Members
// ─────────────────────────────────────────────

export const organizationUsers = pgTable(
  "organization_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: globalRoleEnum("role").notNull().default("MEMBER"),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    uniqueMember: uniqueIndex("uq_org_user").on(t.organizationId, t.userId),
    orgIndex: index("idx_org_users_org").on(t.organizationId),
    userIndex: index("idx_org_users_user").on(t.userId),
  })
);

// ─────────────────────────────────────────────
// Invitations
// ─────────────────────────────────────────────

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    invitedByUserId: uuid("invited_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: globalRoleEnum("role").notNull().default("MEMBER"),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    orgIndex: index("idx_invitations_org").on(t.organizationId),
    tokenIndex: uniqueIndex("uq_invitation_token").on(t.token),
  })
);

// ─────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  organizationUsers: many(organizationUsers),
  invitations: many(invitations),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  organizationUsers: many(organizationUsers),
  invitations: many(invitations),
}));

export const organizationUsersRelations = relations(
  organizationUsers,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationUsers.organizationId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [organizationUsers.userId],
      references: [users.id],
    }),
  })
);
