import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc.js";
import { organizations, organizationUsers } from "@syncora/db";

export const organizationRouter = createTRPCRouter({
  // ── Create organization ───────────────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        slug: z.string().min(1).max(255),
        industry: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if slug is unique
      const existing = await ctx.db.query.organizations.findFirst({
        where: (o, { eq }) => eq(o.slug, input.slug.toLowerCase()),
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "An organization with this URL slug already exists",
        });
      }

      // Insert organization
      const [org] = await ctx.db
        .insert(organizations)
        .values({
          name: input.name,
          slug: input.slug.toLowerCase(),
          industry: input.industry,
          planId: "free",
        })
        .returning();

      if (!org) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create organization record",
        });
      }

      // Link creator as OWNER
      await ctx.db.insert(organizationUsers).values({
        organizationId: org.id,
        userId: ctx.user.id,
        role: "OWNER",
      });

      return org;
    }),

  // ── List user's organizations ─────────────────────────────────
  listMyOrganizations: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.organizationUsers.findMany({
      where: (ou, { eq }) => eq(ou.userId, ctx.user.id),
      with: {
        organization: true,
      },
    });
  }),
});
