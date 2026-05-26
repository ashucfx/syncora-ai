import { initTRPC, TRPCError } from "@trpc/server";
import { createServerClient } from "@supabase/ssr";
import { ZodError } from "zod";
import superjson from "superjson";
import { db } from "@syncora/db";
import type { DB } from "@syncora/db";

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

export interface TRPCContext {
  db: DB;
  user: {
    id: string;
    email: string;
  } | null;
  orgId: string | null; // Resolved from URL or header
  headers: Headers;
}

export async function createTRPCContext(opts: {
  headers: Headers;
  orgSlug?: string;
}): Promise<TRPCContext> {
  // Resolve user from Supabase Auth JWT
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
      global: { headers: { Authorization: opts.headers.get("Authorization") ?? "" } },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Resolve org ID from slug if provided
  let orgId: string | null = null;
  if (opts.orgSlug && user) {
    const org = await db.query.organizations.findFirst({
      where: (orgs, { eq }) => eq(orgs.slug, opts.orgSlug!),
      columns: { id: true },
    });
    orgId = org?.id ?? null;
  }

  return {
    db,
    user: user ? { id: user.id, email: user.email! } : null,
    orgId,
    headers: opts.headers,
  };
}

// ─────────────────────────────────────────────
// tRPC instance
// ─────────────────────────────────────────────

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // Surface Zod validation errors in a structured format
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

// ─────────────────────────────────────────────
// Reusable middleware
// ─────────────────────────────────────────────

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be logged in" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

const enforceOrgMembership = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (!ctx.orgId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Organization context is required" });
  }

  // Verify user is a member of the org
  const membership = await ctx.db.query.organizationUsers.findFirst({
    where: (ou, { and, eq }) =>
      and(eq(ou.userId, ctx.user!.id), eq(ou.organizationId, ctx.orgId!)),
    columns: { role: true },
  });

  if (!membership) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this organization" });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      orgId: ctx.orgId,
      userRole: membership.role,
    },
  });
});

// ─────────────────────────────────────────────
// Exported procedure builders
// ─────────────────────────────────────────────

/** Public — no auth required */
export const publicProcedure = t.procedure;

/** Requires authenticated user */
export const protectedProcedure = t.procedure.use(enforceAuth);

/** Requires auth + verified org membership */
export const orgProcedure = t.procedure.use(enforceOrgMembership);
