import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, orgProcedure, protectedProcedure } from "../trpc.js";
import { invoices, invoiceStatusEnum, paymentProviderEnum } from "@syncora/db";
import { eq, and } from "drizzle-orm";
import { invoiceJobsQueue } from "@syncora/queue";
import { paymentGateway } from "@syncora/payments";

// Generates sequential invoice number: INV-2024-0042
async function generateInvoiceNumber(
  db: Parameters<Parameters<typeof orgProcedure.mutation>[0]>[0]["ctx"]["db"],
  orgId: string
): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.$count(
    invoices,
    and(eq(invoices.organizationId, orgId))
  );
  return `INV-${year}-${String(count + 1).padStart(4, "0")}`;
}

export const billingRouter = createTRPCRouter({
  // ── List invoices ─────────────────────────────────────────────
  listInvoices: orgProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        status: z.enum(invoiceStatusEnum.enumValues).optional(),
        clientId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.invoices.findMany({
        where: (inv, { and, eq }) =>
          and(
            eq(inv.organizationId, input.orgId),
            input.status ? eq(inv.status, input.status) : undefined,
            input.clientId ? eq(inv.clientId, input.clientId) : undefined
          ),
        orderBy: (inv, { desc }) => [desc(inv.createdAt)],
        with: {
          client: { columns: { id: true, name: true, email: true, company: true } },
          milestone: { columns: { id: true, title: true } },
        },
        limit: input.limit,
        offset: input.offset,
      });
    }),

  // ── Get single invoice ────────────────────────────────────────
  getInvoice: orgProcedure
    .input(z.object({ orgId: z.string().uuid(), invoiceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const invoice = await ctx.db.query.invoices.findFirst({
        where: (inv, { and, eq }) =>
          and(eq(inv.id, input.invoiceId), eq(inv.organizationId, input.orgId)),
        with: { client: true, milestone: true },
      });

      if (!invoice) throw new TRPCError({ code: "NOT_FOUND" });
      return invoice;
    }),

  // ── Create invoice ────────────────────────────────────────────
  createInvoice: orgProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        clientId: z.string().uuid(),
        milestoneId: z.string().uuid().optional(),
        subtotal: z.string(), // Decimal as string for precision
        taxAmount: z.string().default("0"),
        total: z.string(),
        currency: z.string().default("USD"),
        taxType: z.enum(["GST", "VAT", "SALES_TAX"]).optional(),
        taxNumber: z.string().optional(),
        notes: z.string().optional(),
        terms: z.string().optional(),
        dueDate: z.date(),
        lineItems: z.array(
          z.object({
            description: z.string(),
            quantity: z.string(),
            unitPrice: z.string(),
            amount: z.string(),
            taxRate: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const number = await generateInvoiceNumber(ctx.db, input.orgId);

      const [invoice] = await ctx.db
        .insert(invoices)
        .values({
          organizationId: input.orgId,
          clientId: input.clientId,
          milestoneId: input.milestoneId,
          number,
          subtotal: input.subtotal,
          taxAmount: input.taxAmount,
          total: input.total,
          currency: input.currency,
          taxType: input.taxType,
          taxNumber: input.taxNumber,
          notes: input.notes,
          terms: input.terms,
          dueDate: input.dueDate,
        })
        .returning();

      return invoice!;
    }),

  // ── Send invoice (generate payment link + email) ───────────────
  sendInvoice: orgProcedure
    .input(z.object({ orgId: z.string().uuid(), invoiceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.db.query.invoices.findFirst({
        where: (inv, { eq }) => eq(inv.id, input.invoiceId),
        with: { client: true },
      });

      if (!invoice) throw new TRPCError({ code: "NOT_FOUND" });
      if (invoice.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft invoices can be sent",
        });
      }

      // Queue the send job — this generates PDF + payment link + sends email
      await invoiceJobsQueue.add(
        "send-invoice",
        {
          type: "SEND_INVOICE",
          invoiceId: input.invoiceId,
          organizationId: input.orgId,
          clientEmail: invoice.client.email,
        },
        { jobId: `send-invoice-${input.invoiceId}` } // Idempotent
      );

      // Update status optimistically
      await ctx.db
        .update(invoices)
        .set({ status: "SENT", sentAt: new Date(), updatedAt: new Date() })
        .where(eq(invoices.id, input.invoiceId));

      return { queued: true };
    }),

  // ── Mark invoice paid (manual override for bank transfers) ────
  markPaid: orgProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        invoiceId: z.string().uuid(),
        paymentProvider: z.enum(paymentProviderEnum.enumValues).default("MANUAL"),
        paymentRef: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(invoices)
        .set({
          status: "PAID",
          paidAt: new Date(),
          paymentProvider: input.paymentProvider,
          paymentRef: input.paymentRef,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(invoices.id, input.invoiceId),
            eq(invoices.organizationId, input.orgId)
          )
        )
        .returning();

      return updated!;
    }),

  // ── Get active payment providers ──────────────────────────────
  getActivePaymentProviders: protectedProcedure
    .query(async () => {
      const active: ("STRIPE" | "RAZORPAY" | "PAYPAL")[] = [];
      if (process.env.STRIPE_SECRET_KEY) active.push("STRIPE");
      if (process.env.RAZORPAY_KEY_ID) active.push("RAZORPAY");
      // If nothing is configured in env, default to STRIPE for demo/testing
      if (active.length === 0) active.push("STRIPE");
      return active;
    }),

  // ── Create checkout session for portal clients ────────────────
  createPortalCheckoutSession: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string().uuid(),
        provider: z.enum(["STRIPE", "RAZORPAY", "PAYPAL"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Fetch invoice and verify client belongs to the logged-in user
      const invoice = await ctx.db.query.invoices.findFirst({
        where: (inv, { eq }) => eq(inv.id, input.invoiceId),
        with: {
          client: true,
          organization: true,
        },
      });

      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      if (invoice.client.email.toLowerCase() !== ctx.user.email.toLowerCase()) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to pay this invoice",
        });
      }

      if (invoice.status === "PAID") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invoice is already paid",
        });
      }

      // 2. Resolve payment provider from gateway
      const gateway = paymentGateway.get(input.provider);

      // Construct success and cancel redirect URLs
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const successUrl = `${appUrl}/${invoice.organization.slug}/client?success=true&invoiceId=${invoice.id}`;
      const cancelUrl = `${appUrl}/${invoice.organization.slug}/client?canceled=true`;

      // Convert total (stored as decimal/string) to cents/paise (integer)
      const amountFloat = parseFloat(invoice.total);
      const amountInSmallestUnit = Math.round(amountFloat * 100);

      // 3. Create checkout session using provider adapter
      const session = await gateway.createCheckoutSession({
        invoiceId: invoice.id,
        amount: amountInSmallestUnit,
        currency: invoice.currency,
        customerEmail: invoice.client.email,
        customerName: invoice.client.name,
        description: `Invoice ${invoice.number} for ${invoice.organization.name}`,
        successUrl,
        cancelUrl,
      });

      // 4. Update the invoice record
      await ctx.db
        .update(invoices)
        .set({
          paymentProvider: input.provider,
          paymentRef: session.sessionId,
          paymentUrl: session.paymentUrl,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoice.id));

      return { paymentUrl: session.paymentUrl };
    }),
});

