import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, orgProcedure } from "../trpc.js";
import {
  projects,
  tasks,
  taskLists,
  milestones,
  projectMembers,
  taskStatusEnum,
  projectStatusEnum,
  priorityEnum,
} from "@syncora/db";
import { eq, and, sql } from "drizzle-orm";
import { aiJobsQueue } from "@syncora/queue";

export const projectsRouter = createTRPCRouter({
  // ── List projects ─────────────────────────────────────────────
  listProjects: orgProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        status: z.enum(projectStatusEnum.enumValues).optional(),
        clientId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.projects.findMany({
        where: (p, { and, eq }) =>
          and(
            eq(p.organizationId, input.orgId),
            input.status ? eq(p.status, input.status) : undefined,
            input.clientId ? eq(p.clientId, input.clientId) : undefined
          ),
        orderBy: (p, { desc }) => [desc(p.updatedAt)],
        with: {
          client: { columns: { id: true, name: true, company: true } },
          members: { limit: 5 },
          milestones: { where: (m, { eq }) => eq(m.isCompleted, false) },
        },
      });
    }),

  // ── Get project with full detail ──────────────────────────────
  getProject: orgProcedure
    .input(z.object({ orgId: z.string().uuid(), projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: (p, { and, eq }) =>
          and(eq(p.id, input.projectId), eq(p.organizationId, input.orgId)),
        with: {
          client: true,
          taskLists: {
            orderBy: (tl, { asc }) => [asc(tl.position)],
            with: {
              tasks: {
                orderBy: (t, { asc }) => [asc(t.position)],
              },
            },
          },
          milestones: { orderBy: (m, { asc }) => [asc(m.dueDate)] },
          members: true,
        },
      });

      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      return project;
    }),

  // ── Create project ────────────────────────────────────────────
  createProject: orgProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        clientId: z.string().uuid().optional(),
        status: z.enum(projectStatusEnum.enumValues).default("PLANNING"),
        priority: z.enum(priorityEnum.enumValues).default("MEDIUM"),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        budget: z.string().optional(),
        currency: z.string().default("USD"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .insert(projects)
        .values({
          organizationId: input.orgId,
          clientId: input.clientId,
          name: input.name,
          description: input.description,
          status: input.status,
          priority: input.priority,
          startDate: input.startDate,
          endDate: input.endDate,
          budget: input.budget,
          currency: input.currency,
        })
        .returning();

      // Create default task lists (Kanban columns)
      await ctx.db.insert(taskLists).values([
        { projectId: project!.id, name: "To Do", position: 0 },
        { projectId: project!.id, name: "In Progress", position: 1 },
        { projectId: project!.id, name: "In Review", position: 2 },
        { projectId: project!.id, name: "Done", position: 3 },
      ]);

      // Add creator as project manager
      await ctx.db.insert(projectMembers).values({
        projectId: project!.id,
        userId: ctx.user.id,
        role: "MANAGER",
      });

      return project!;
    }),

  // ── Create task ───────────────────────────────────────────────
  createTask: orgProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        projectId: z.string().uuid(),
        taskListId: z.string().uuid().optional(),
        title: z.string().min(1).max(500),
        description: z.string().optional(),
        assigneeId: z.string().uuid().optional(),
        priority: z.enum(priorityEnum.enumValues).default("MEDIUM"),
        dueDate: z.date().optional(),
        parentId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Calculate position (end of list)
      const lastTask = await ctx.db
        .select({ pos: sql<number>`MAX(position)` })
        .from(tasks)
        .where(
          and(
            eq(tasks.projectId, input.projectId),
            input.taskListId ? eq(tasks.taskListId, input.taskListId) : undefined
          )
        );

      const position = (lastTask[0]?.pos ?? -1) + 1;

      const [task] = await ctx.db
        .insert(tasks)
        .values({
          projectId: input.projectId,
          taskListId: input.taskListId,
          parentId: input.parentId,
          assigneeId: input.assigneeId,
          reporterId: ctx.user.id,
          title: input.title,
          description: input.description,
          priority: input.priority,
          dueDate: input.dueDate,
          position,
        })
        .returning();

      return task!;
    }),

  // ── Update task status (Kanban move) ──────────────────────────
  updateTaskStatus: orgProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        taskId: z.string().uuid(),
        status: z.enum(taskStatusEnum.enumValues),
        taskListId: z.string().uuid().optional(),
        position: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const completedAt =
        input.status === "DONE" ? new Date() : null;

      const [updated] = await ctx.db
        .update(tasks)
        .set({
          status: input.status,
          taskListId: input.taskListId,
          position: input.position,
          completedAt: completedAt ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, input.taskId))
        .returning();

      return updated!;
    }),

  // ── Complete milestone + optionally auto-invoice ───────────────
  completeMilestone: orgProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        milestoneId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const milestone = await ctx.db.query.milestones.findFirst({
        where: (m, { eq }) => eq(m.id, input.milestoneId),
        with: { project: { columns: { clientId: true } } },
      });

      if (!milestone) throw new TRPCError({ code: "NOT_FOUND" });

      const [updated] = await ctx.db
        .update(milestones)
        .set({ isCompleted: true, completedAt: new Date(), updatedAt: new Date() })
        .where(eq(milestones.id, input.milestoneId))
        .returning();

      // If auto-invoice is enabled, queue an invoice generation job
      if (milestone.autoInvoice && milestone.project.clientId) {
        await aiJobsQueue.add("generate-milestone-invoice", {
          capability: "embed-content",
          organizationId: input.orgId,
          entityType: "milestone",
          entityId: input.milestoneId,
          content: `Milestone completed: ${milestone.title}`,
        });
      }

      return updated!;
    }),

  // ── Get project AI summary ────────────────────────────────────
  requestAiSummary: orgProcedure
    .input(z.object({ orgId: z.string().uuid(), projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await aiJobsQueue.add("summarize-project", {
        capability: "summarize-project",
        organizationId: input.orgId,
        projectId: input.projectId,
        requestedByUserId: ctx.user.id,
      });

      return { queued: true };
    }),
});
