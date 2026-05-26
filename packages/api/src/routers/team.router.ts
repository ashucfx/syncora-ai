import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, orgProcedure } from "../trpc.js";
import { organizationUsers, invitations, globalRoleEnum } from "@syncora/db";
import { eq, and } from "drizzle-orm";

export const teamRouter = createTRPCRouter({
  // ── List all members in the organization ──────────────────────
  listMembers: orgProcedure
    .input(z.object({ orgId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.organizationUsers.findMany({
        where: (ou, { eq }) => eq(ou.organizationId, input.orgId),
        with: {
          user: true,
        },
      });
    }),

  // ── Update a member's role ────────────────────────────────────
  updateMemberRole: orgProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        userId: z.string().uuid(),
        role: z.enum(globalRoleEnum.enumValues),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only OWNER and ADMIN can update roles
      if (!["OWNER", "ADMIN"].includes(ctx.userRole)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization owners and admins can manage roles",
        });
      }

      // If updating to/from OWNER, require OWNER role
      if ((input.role === "OWNER" || ctx.userRole !== "OWNER") && ctx.userRole !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners can assign the OWNER role or modify another owner's role",
        });
      }

      const [updated] = await ctx.db
        .update(organizationUsers)
        .set({ role: input.role })
        .where(
          and(
            eq(organizationUsers.userId, input.userId),
            eq(organizationUsers.organizationId, input.orgId)
          )
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found in organization",
        });
      }

      return updated;
    }),

  // ── Remove a member from the organization ─────────────────────
  removeMember: orgProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        userId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only OWNER and ADMIN can remove members
      if (!["OWNER", "ADMIN"].includes(ctx.userRole)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization owners and admins can remove members",
        });
      }

      // Check if target is the last owner
      const targetMember = await ctx.db.query.organizationUsers.findFirst({
        where: (ou, { and, eq }) =>
          and(eq(ou.userId, input.userId), eq(ou.organizationId, input.orgId)),
      });

      if (!targetMember) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found in organization",
        });
      }

      if (targetMember.role === "OWNER") {
        const ownerCount = await ctx.db.query.organizationUsers.findMany({
          where: (ou, { and, eq }) =>
            and(eq(ou.organizationId, input.orgId), eq(ou.role, "OWNER")),
        });

        if (ownerCount.length <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot remove the only owner of the organization. Transfer ownership first.",
          });
        }
      }

      // Prevent ADMIN from removing OWNER
      if (targetMember.role === "OWNER" && ctx.userRole !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners can remove other owners",
        });
      }

      const [deleted] = await ctx.db
        .delete(organizationUsers)
        .where(
          and(
            eq(organizationUsers.userId, input.userId),
            eq(organizationUsers.organizationId, input.orgId)
          )
        )
        .returning();

      return deleted;
    }),

  // ── List invitations ──────────────────────────────────────────
  listInvitations: orgProcedure
    .input(z.object({ orgId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.invitations.findMany({
        where: (inv, { and, eq, isNull }) =>
          and(eq(inv.organizationId, input.orgId), isNull(inv.acceptedAt)),
      });
    }),

  // ── Create an invitation ──────────────────────────────────────
  inviteMember: orgProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        email: z.string().email(),
        role: z.enum(globalRoleEnum.enumValues).default("MEMBER"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only OWNER and ADMIN can invite
      if (!["OWNER", "ADMIN"].includes(ctx.userRole)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization owners and admins can invite members",
        });
      }

      // Prevent inviting already existing member
      const existingUser = await ctx.db.query.users.findFirst({
        where: (u, { eq }) => eq(u.email, input.email),
      });

      if (existingUser) {
        const existingMembership = await ctx.db.query.organizationUsers.findFirst({
          where: (ou, { and, eq }) =>
            and(
              eq(ou.userId, existingUser.id),
              eq(ou.organizationId, input.orgId)
            ),
        });

        if (existingMembership) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User is already a member of this organization",
          });
        }
      }

      // Create unique secure token
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      const [invitation] = await ctx.db
        .insert(invitations)
        .values({
          organizationId: input.orgId,
          invitedByUserId: ctx.user.id,
          email: input.email.toLowerCase(),
          role: input.role,
          token,
          expiresAt,
        })
        .returning();

      // TODO: Publish event for email queue / n8n workflow to send invite email

      return invitation!;
    }),

  // ── Revoke invitation ─────────────────────────────────────────
  revokeInvitation: orgProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        invitationId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!["OWNER", "ADMIN"].includes(ctx.userRole)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization owners and admins can revoke invitations",
        });
      }

      const [revoked] = await ctx.db
        .delete(invitations)
        .where(
          and(
            eq(invitations.id, input.invitationId),
            eq(invitations.organizationId, input.orgId)
          )
        )
        .returning();

      if (!revoked) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      return revoked;
    }),
});
