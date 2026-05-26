import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, orgProcedure } from "../trpc.js";
import {
  clients,
  clientNotes,
  clientStatusEnum,
} from "@syncora/db";
import { eq, and, desc, ilike, or } from "drizzle-orm";

const createClientSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(1).max(255),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  website: z.string().url().optional(),
  status: z.enum(clientStatusEnum.enumValues).optional().default("LEAD"),
  notes: z.string().optional(),
  address: z
    .object({
      line1: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      postalCode: z.string().optional(),
    })
    .optional(),
});

const updateClientSchema = createClientSchema.partial().extend({
  clientId: z.string().uuid(),
  orgId: z.string().uuid(),
});

export const crmRouter = createTRPCRouter({
  // ── List all clients with optional search ─────────────────────
  listClients: orgProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        search: z.string().optional(),
        status: z.enum(clientStatusEnum.enumValues).optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(clients.organizationId, input.orgId)];

      if (input.status) {
        conditions.push(eq(clients.status, input.status));
      }

      const results = await ctx.db
        .select()
        .from(clients)
        .where(
          input.search
            ? and(
                ...conditions,
                or(
                  ilike(clients.name, `%${input.search}%`),
                  ilike(clients.email, `%${input.search}%`),
                  ilike(clients.company, `%${input.search}%`)
                )
              )
            : and(...conditions)
        )
        .orderBy(desc(clients.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return results;
    }),

  // ── Get single client with contacts ──────────────────────────
  getClient: orgProcedure
    .input(z.object({ orgId: z.string().uuid(), clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const client = await ctx.db.query.clients.findFirst({
        where: (c, { and, eq }) =>
          and(
            eq(c.id, input.clientId),
            eq(c.organizationId, input.orgId)
          ),
        with: {
          contacts: true,
          notes: { orderBy: (n, { desc }) => [desc(n.createdAt)], limit: 20 },
        },
      });

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      return client;
    }),

  // ── Create client ─────────────────────────────────────────────
  createClient: orgProcedure
    .input(createClientSchema)
    .mutation(async ({ ctx, input }) => {
      const [client] = await ctx.db
        .insert(clients)
        .values({
          organizationId: input.orgId,
          name: input.name,
          email: input.email,
          phone: input.phone,
          company: input.company,
          website: input.website,
          status: input.status,
          notes: input.notes,
          address: input.address,
        })
        .returning();

      return client!;
    }),

  // ── Update client ─────────────────────────────────────────────
  updateClient: orgProcedure
    .input(updateClientSchema)
    .mutation(async ({ ctx, input }) => {
      const { clientId, orgId, ...data } = input;

      const [updated] = await ctx.db
        .update(clients)
        .set({ ...data, updatedAt: new Date() })
        .where(
          and(eq(clients.id, clientId), eq(clients.organizationId, orgId))
        )
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return updated;
    }),

  // ── Add note ──────────────────────────────────────────────────
  addNote: orgProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        clientId: z.string().uuid(),
        content: z.string().min(1),
        type: z.enum(["NOTE", "CALL", "EMAIL", "MEETING"]).default("NOTE"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [note] = await ctx.db
        .insert(clientNotes)
        .values({
          clientId: input.clientId,
          organizationId: input.orgId,
          authorId: ctx.user.id,
          content: input.content,
          type: input.type,
        })
        .returning();

      return note!;
    }),

  // ── Update client status ──────────────────────────────────────
  updateStatus: orgProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        clientId: z.string().uuid(),
        status: z.enum(clientStatusEnum.enumValues),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(clients)
        .set({ status: input.status, updatedAt: new Date() })
        .where(
          and(
            eq(clients.id, input.clientId),
            eq(clients.organizationId, input.orgId)
          )
        )
        .returning();

      return updated!;
    }),
});
