import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  index,
  integer,
  boolean,
  numeric,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./identity.js";
import { clients } from "./crm.js";

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export const projectStatusEnum = pgEnum("project_status", [
  "PLANNING",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "ARCHIVED",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "CANCELLED",
]);

export const priorityEnum = pgEnum("priority", [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
]);

// ─────────────────────────────────────────────
// Projects
// ─────────────────────────────────────────────

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    description: text("description"),
    status: projectStatusEnum("status").notNull().default("PLANNING"),
    priority: priorityEnum("priority").notNull().default("MEDIUM"),
    coverColor: text("cover_color").default("#6366f1"), // For UI
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    budget: numeric("budget", { precision: 12, scale: 2 }),
    currency: text("currency").notNull().default("USD"),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    orgIndex: index("idx_projects_org").on(t.organizationId),
    clientIndex: index("idx_projects_client").on(t.clientId),
    statusIndex: index("idx_projects_status").on(t.status),
  })
);

// ─────────────────────────────────────────────
// Task Lists / Columns
// ─────────────────────────────────────────────

export const taskLists = pgTable(
  "task_lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    color: text("color"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    projectIndex: index("idx_task_lists_project").on(t.projectId),
  })
);

// ─────────────────────────────────────────────
// Tasks
// ─────────────────────────────────────────────

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    taskListId: uuid("task_list_id").references(() => taskLists.id, {
      onDelete: "set null",
    }),
    parentId: uuid("parent_id"), // Self-ref for subtasks (set as FK via migration)
    assigneeId: uuid("assignee_id"), // References users.id — set via raw FK in migration
    reporterId: uuid("reporter_id"), // Who created it
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatusEnum("status").notNull().default("TODO"),
    priority: priorityEnum("priority").notNull().default("MEDIUM"),
    position: integer("position").notNull().default(0), // Ordering within column
    estimatedHours: numeric("estimated_hours", { precision: 6, scale: 2 }),
    loggedHours: numeric("logged_hours", { precision: 6, scale: 2 }).default("0"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    projectIndex: index("idx_tasks_project").on(t.projectId),
    assigneeIndex: index("idx_tasks_assignee").on(t.assigneeId),
    statusIndex: index("idx_tasks_status").on(t.status),
    listIndex: index("idx_tasks_list").on(t.taskListId),
  })
);

// ─────────────────────────────────────────────
// Task Comments
// ─────────────────────────────────────────────

export const taskComments = pgTable(
  "task_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull(),
    content: text("content").notNull(),
    isEdited: boolean("is_edited").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    taskIndex: index("idx_task_comments_task").on(t.taskId),
  })
);

// ─────────────────────────────────────────────
// Milestones
// ─────────────────────────────────────────────

export const milestones = pgTable(
  "milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    isCompleted: boolean("is_completed").notNull().default(false),
    autoInvoice: boolean("auto_invoice").notNull().default(false), // Auto-generate invoice on completion
    dueDate: timestamp("due_date", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    projectIndex: index("idx_milestones_project").on(t.projectId),
  })
);

// ─────────────────────────────────────────────
// Project Members
// ─────────────────────────────────────────────

export const projectMembers = pgTable(
  "project_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    role: text("role").notNull().default("CONTRIBUTOR"), // 'MANAGER' | 'CONTRIBUTOR' | 'VIEWER'
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    projectIndex: index("idx_project_members_project").on(t.projectId),
    userIndex: index("idx_project_members_user").on(t.userId),
  })
);

// ─────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  tasks: many(tasks),
  taskLists: many(taskLists),
  milestones: many(milestones),
  members: many(projectMembers),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  taskList: one(taskLists, {
    fields: [tasks.taskListId],
    references: [taskLists.id],
  }),
  comments: many(taskComments),
}));

export const milestonesRelations = relations(milestones, ({ one }) => ({
  project: one(projects, {
    fields: [milestones.projectId],
    references: [projects.id],
  }),
}));

export const taskListsRelations = relations(taskLists, ({ one, many }) => ({
  project: one(projects, {
    fields: [taskLists.projectId],
    references: [projects.id],
  }),
  tasks: many(tasks),
}));
